import { and, desc, eq, sql } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import {
  foodCourts,
  foodCourtWithdrawals,
  kitchenQueues,
  orders,
  payments,
  tables,
  tenantOrders,
  tenants,
  withdrawalRequests,
} from "../../db/schema";

interface DateRange {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
}

function parseDateRange(range: string = "30d"): DateRange {
  const now = new Date();
  let startDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;

  if (range === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
  } else if (range === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
  } else if (range === "year") {
    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
  } else {
    // Default: 30d
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
  }

  return {
    startDate,
    endDate: now,
    prevStartDate,
    prevEndDate,
  };
}

function extractRows<T = any>(result: any): T[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) {
      return result[0] as T[];
    }
    return result as T[];
  }
  if (Array.isArray(result.rows)) {
    return result.rows as T[];
  }
  return [];
}

export class FoodCourtStatsService {
  /**
   * Super Admin Dashboard Stats
   * GET /api/super-admin/dashboard-stats?range=today|7d|30d|year&foodCourtId=all|<id>
   */
  async getSuperAdminDashboardStats(
    user: AuthUser,
    range: string = "30d",
    foodCourtId: string = "all"
  ) {
    if (user.role !== "admin") {
      throw new ForbiddenError("Hanya Super Admin yang dapat mengakses analitik ini");
    }

    const { startDate, endDate, prevStartDate, prevEndDate } = parseDateRange(range);
    const filterBranch = foodCourtId && foodCourtId !== "all";

    // 1. Current Period Summary (GMV, Completed Orders)
    const currentOrdersQuery = filterBranch
      ? sql`
        SELECT 
          COALESCE(SUM(o.total_amount), 0) AS totalGmv,
          COUNT(o.id) AS totalCompletedOrders
        FROM orders o
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE o.order_status = 'COMPLETED'
          AND ds.food_court_id = ${foodCourtId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
      `
      : sql`
        SELECT 
          COALESCE(SUM(o.total_amount), 0) AS totalGmv,
          COUNT(o.id) AS totalCompletedOrders
        FROM orders o
        WHERE o.order_status = 'COMPLETED'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
      `;

    // 2. Previous Period Summary (for growth calculation)
    const prevOrdersQuery = filterBranch
      ? sql`
        SELECT 
          COALESCE(SUM(o.total_amount), 0) AS prevGmv,
          COUNT(o.id) AS prevCompletedOrders
        FROM orders o
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE o.order_status = 'COMPLETED'
          AND ds.food_court_id = ${foodCourtId}
          AND o.created_at >= ${prevStartDate}
          AND o.created_at < ${prevEndDate}
      `
      : sql`
        SELECT 
          COALESCE(SUM(o.total_amount), 0) AS prevGmv,
          COUNT(o.id) AS prevCompletedOrders
        FROM orders o
        WHERE o.order_status = 'COMPLETED'
          AND o.created_at >= ${prevStartDate}
          AND o.created_at < ${prevEndDate}
      `;

    // 3. Pending Food Court Withdrawals
    const pendingWithdrawalsQuery = filterBranch
      ? sql`
        SELECT 
          COALESCE(SUM(amount), 0) AS pendingAmount,
          COUNT(id) AS pendingCount
        FROM food_court_withdrawals
        WHERE status = 'PENDING'
          AND food_court_id = ${foodCourtId}
      `
      : sql`
        SELECT 
          COALESCE(SUM(amount), 0) AS pendingAmount,
          COUNT(id) AS pendingCount
        FROM food_court_withdrawals
        WHERE status = 'PENDING'
      `;

    const [currentRes, prevRes, pendingRes] = await Promise.all([
      db.execute(currentOrdersQuery),
      db.execute(prevOrdersQuery),
      db.execute(pendingWithdrawalsQuery),
    ]);

    const currentRow = extractRows<any>(currentRes)[0] || {};
    const prevRow = extractRows<any>(prevRes)[0] || {};
    const pendingRow = extractRows<any>(pendingRes)[0] || {};

    const totalGmv = Number(currentRow.totalGmv || 0);
    const totalCompletedOrders = Number(currentRow.totalCompletedOrders || 0);
    const prevGmv = Number(prevRow.prevGmv || 0);
    const prevOrders = Number(prevRow.prevCompletedOrders || 0);

    const gmvGrowthPercentage =
      prevGmv > 0
        ? Number((((totalGmv - prevGmv) / prevGmv) * 100).toFixed(1))
        : totalGmv > 0
        ? 100
        : 0;

    const ordersGrowthPercentage =
      prevOrders > 0
        ? Number((((totalCompletedOrders - prevOrders) / prevOrders) * 100).toFixed(1))
        : totalCompletedOrders > 0
        ? 100
        : 0;

    const platformFeeEarned = Math.round(totalGmv * 0.01);
    const pendingWithdrawalAmount = Number(pendingRow.pendingAmount || 0);
    const pendingWithdrawalCount = Number(pendingRow.pendingCount || 0);

    // 4. Branch Leaderboard
    const branchLeaderboardQuery = filterBranch
      ? sql`
        SELECT 
          fc.id AS foodCourtId,
          fc.name AS name,
          COALESCE(SUM(o.total_amount), 0) AS totalGmv,
          COUNT(o.id) AS totalOrders,
          (SELECT COUNT(t.id) FROM tenants t WHERE t.food_court_id = fc.id AND t.is_open = 1) AS activeTenantsCount
        FROM food_courts fc
        LEFT JOIN dining_sessions ds ON fc.id = ds.food_court_id
        LEFT JOIN orders o ON ds.id = o.session_id 
          AND o.order_status = 'COMPLETED'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        WHERE fc.id = ${foodCourtId}
        GROUP BY fc.id, fc.name
        ORDER BY totalGmv DESC
      `
      : sql`
        SELECT 
          fc.id AS foodCourtId,
          fc.name AS name,
          COALESCE(SUM(o.total_amount), 0) AS totalGmv,
          COUNT(o.id) AS totalOrders,
          (SELECT COUNT(t.id) FROM tenants t WHERE t.food_court_id = fc.id AND t.is_open = 1) AS activeTenantsCount
        FROM food_courts fc
        LEFT JOIN dining_sessions ds ON fc.id = ds.food_court_id
        LEFT JOIN orders o ON ds.id = o.session_id 
          AND o.order_status = 'COMPLETED'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY fc.id, fc.name
        ORDER BY totalGmv DESC
      `;

    const branchRes = await db.execute(branchLeaderboardQuery);
    const branchRows = extractRows<any>(branchRes);

    const branchLeaderboard = branchRows.map((row) => {
      const gmv = Number(row.totalGmv || 0);
      const ordersCount = Number(row.totalOrders || 0);
      return {
        foodCourtId: row.foodCourtId,
        name: row.name,
        totalGmv: gmv,
        totalOrders: ordersCount,
        platformFeeContributed: Math.round(gmv * 0.01),
        aov: ordersCount > 0 ? Math.round(gmv / ordersCount) : 0,
        activeTenantsCount: Number(row.activeTenantsCount || 0),
      };
    });

    // 5. Channel Distribution
    const channelQuery = filterBranch
      ? sql`
        SELECT 
          CASE 
            WHEN ds.kiosk_id IS NOT NULL THEN 'kiosk'
            WHEN ds.table_id IS NOT NULL THEN 'tableQr'
            ELSE 'cashierPos'
          END AS channel,
          COUNT(o.id) AS count
        FROM orders o
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE o.order_status = 'COMPLETED'
          AND ds.food_court_id = ${foodCourtId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY channel
      `
      : sql`
        SELECT 
          CASE 
            WHEN ds.kiosk_id IS NOT NULL THEN 'kiosk'
            WHEN ds.table_id IS NOT NULL THEN 'tableQr'
            ELSE 'cashierPos'
          END AS channel,
          COUNT(o.id) AS count
        FROM orders o
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE o.order_status = 'COMPLETED'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY channel
      `;

    // 6. Payment Composition
    const paymentQuery = filterBranch
      ? sql`
        SELECT 
          CASE 
            WHEN p.payment_method = 'CASH' THEN 'cash'
            ELSE 'qrisMidtrans'
          END AS pMethod,
          COALESCE(SUM(p.amount), 0) AS totalAmount
        FROM payments p
        JOIN payment_groups pg ON p.payment_group_id = pg.id
        JOIN orders o ON pg.order_id = o.id
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE p.status = 'SUCCESS'
          AND ds.food_court_id = ${foodCourtId}
          AND p.created_at >= ${startDate}
          AND p.created_at <= ${endDate}
        GROUP BY pMethod
      `
      : sql`
        SELECT 
          CASE 
            WHEN p.payment_method = 'CASH' THEN 'cash'
            ELSE 'qrisMidtrans'
          END AS pMethod,
          COALESCE(SUM(p.amount), 0) AS totalAmount
        FROM payments p
        WHERE p.status = 'SUCCESS'
          AND p.created_at >= ${startDate}
          AND p.created_at <= ${endDate}
        GROUP BY pMethod
      `;

    // 7. Kitchen SLA Query
    const kitchenSlaQuery = filterBranch
      ? sql`
        SELECT 
          COALESCE(AVG(TIMESTAMPDIFF(MINUTE, kq.queued_at, kq.finished_at)), 0) AS avgMinutes,
          COUNT(kq.id) AS totalQueues,
          SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, kq.queued_at, kq.finished_at) <= 20 THEN 1 ELSE 0 END) AS onTimeCount
        FROM kitchen_queues kq
        JOIN tenant_orders to_ord ON kq.tenant_order_id = to_ord.id
        JOIN orders o ON to_ord.order_id = o.id
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE kq.finished_at IS NOT NULL
          AND ds.food_court_id = ${foodCourtId}
          AND kq.created_at >= ${startDate}
          AND kq.created_at <= ${endDate}
      `
      : sql`
        SELECT 
          COALESCE(AVG(TIMESTAMPDIFF(MINUTE, kq.queued_at, kq.finished_at)), 0) AS avgMinutes,
          COUNT(kq.id) AS totalQueues,
          SUM(CASE WHEN TIMESTAMPDIFF(MINUTE, kq.queued_at, kq.finished_at) <= 20 THEN 1 ELSE 0 END) AS onTimeCount
        FROM kitchen_queues kq
        WHERE kq.finished_at IS NOT NULL
          AND kq.created_at >= ${startDate}
          AND kq.created_at <= ${endDate}
      `;

    const [channelRes, paymentRes, kitchenRes] = await Promise.all([
      db.execute(channelQuery),
      db.execute(paymentQuery),
      db.execute(kitchenSlaQuery),
    ]);

    const channelRows = extractRows<any>(channelRes);
    let tableQrCount = 0;
    let kioskCount = 0;
    let cashierPosCount = 0;

    for (const ch of channelRows) {
      const c = Number(ch.count || 0);
      if (ch.channel === "tableQr") tableQrCount += c;
      else if (ch.channel === "kiosk") kioskCount += c;
      else cashierPosCount += c;
    }
    const totalChannels = tableQrCount + kioskCount + cashierPosCount;
    const channelDistribution = {
      tableQr: {
        count: tableQrCount,
        percentage:
          totalChannels > 0
            ? Number(((tableQrCount / totalChannels) * 100).toFixed(1))
            : 0,
      },
      kiosk: {
        count: kioskCount,
        percentage:
          totalChannels > 0
            ? Number(((kioskCount / totalChannels) * 100).toFixed(1))
            : 0,
      },
      cashierPos: {
        count: cashierPosCount,
        percentage:
          totalChannels > 0
            ? Number(((cashierPosCount / totalChannels) * 100).toFixed(1))
            : 0,
      },
    };

    const paymentRows = extractRows<any>(paymentRes);
    let qrisAmount = 0;
    let cashAmount = 0;
    for (const p of paymentRows) {
      const amt = Number(p.totalAmount || 0);
      if (p.pMethod === "cash") cashAmount += amt;
      else qrisAmount += amt;
    }
    const totalPayments = qrisAmount + cashAmount;
    const paymentComposition = {
      qrisMidtrans: {
        amount: qrisAmount,
        percentage:
          totalPayments > 0
            ? Number(((qrisAmount / totalPayments) * 100).toFixed(1))
            : 0,
      },
      cash: {
        amount: cashAmount,
        percentage:
          totalPayments > 0
            ? Number(((cashAmount / totalPayments) * 100).toFixed(1))
            : 0,
      },
    };

    const kitchenRow = extractRows<any>(kitchenRes)[0] || {};
    const totalQueues = Number(kitchenRow.totalQueues || 0);
    const onTimeCount = Number(kitchenRow.onTimeCount || 0);
    const avgMinutes = Number(kitchenRow.avgMinutes || 0);
    const kitchenSla = {
      averageCookingTimeMinutes: totalQueues > 0 ? Number(avgMinutes.toFixed(1)) : 0,
      targetMinutes: 20.0,
      onTimePercentage:
        totalQueues > 0
          ? Number(((onTimeCount / totalQueues) * 100).toFixed(1))
          : 100,
    };

    // 8. Trends (Daily aggregation)
    const trendsQuery = filterBranch
      ? sql`
        SELECT 
          DATE_FORMAT(o.created_at, '%Y-%m-%d') AS dateStr,
          COALESCE(SUM(o.total_amount), 0) AS gmv,
          COUNT(o.id) AS orderCount
        FROM orders o
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE o.order_status = 'COMPLETED'
          AND ds.food_court_id = ${foodCourtId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY dateStr
        ORDER BY dateStr ASC
      `
      : sql`
        SELECT 
          DATE_FORMAT(o.created_at, '%Y-%m-%d') AS dateStr,
          COALESCE(SUM(o.total_amount), 0) AS gmv,
          COUNT(o.id) AS orderCount
        FROM orders o
        WHERE o.order_status = 'COMPLETED'
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY dateStr
        ORDER BY dateStr ASC
      `;

    const trendsRes = await db.execute(trendsQuery);
    const trendRows = extractRows<any>(trendsRes);
    const trends = trendRows.map((r) => {
      const gmvVal = Number(r.gmv || 0);
      return {
        date: r.dateStr,
        gmv: gmvVal,
        platformFee: Math.round(gmvVal * 0.01),
        orderCount: Number(r.orderCount || 0),
      };
    });

    return {
      summary: {
        totalGmv,
        gmvGrowthPercentage,
        platformFeeEarned,
        totalCompletedOrders,
        ordersGrowthPercentage,
        pendingWithdrawalAmount,
        pendingWithdrawalCount,
      },
      branchLeaderboard,
      operational: {
        channelDistribution,
        kitchenSla,
        paymentComposition,
      },
      trends,
    };
  }

  /**
   * Admin Food Court Branch Stats
   * GET /api/admin/food-court/dashboard-stats?range=today|7d|30d
   */
  async getFoodCourtManagerStats(user: AuthUser, range: string = "today") {
    let fc = null;
    if (user.role === "admin-food-court") {
      fc = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.managerId, user.id),
      });
      if (!fc) {
        throw new NotFoundError(
          "Anda belum ditugaskan sebagai manajer pada cabang food court manapun"
        );
      }
    } else if (user.role === "admin") {
      fc = await db.query.foodCourts.findFirst();
      if (!fc) {
        throw new NotFoundError("Tidak ada food court terdaftar di sistem");
      }
    } else {
      throw new ForbiddenError("Hanya pengelola cabang yang dapat mengakses dashboard ini");
    }

    const { startDate, endDate, prevStartDate, prevEndDate } = parseDateRange(range);
    const fcId = fc.id;

    // 1. Branch Revenue (Current and Previous)
    const currentRevQuery = sql`
      SELECT 
        COALESCE(SUM(o.total_amount), 0) AS totalRevenue,
        COUNT(o.id) AS completedOrdersCount
      FROM orders o
      JOIN dining_sessions ds ON o.session_id = ds.id
      WHERE o.order_status = 'COMPLETED'
        AND ds.food_court_id = ${fcId}
        AND o.created_at >= ${startDate}
        AND o.created_at <= ${endDate}
    `;

    const prevRevQuery = sql`
      SELECT 
        COALESCE(SUM(o.total_amount), 0) AS prevRevenue
      FROM orders o
      JOIN dining_sessions ds ON o.session_id = ds.id
      WHERE o.order_status = 'COMPLETED'
        AND ds.food_court_id = ${fcId}
        AND o.created_at >= ${prevStartDate}
        AND o.created_at < ${prevEndDate}
    `;

    // 2. Pending Tenant Withdrawals
    const pendingWithdrawalsQuery = sql`
      SELECT 
        COALESCE(SUM(amount), 0) AS totalAmount,
        COUNT(id) AS count
      FROM withdrawal_requests
      WHERE food_court_id = ${fcId}
        AND status = 'PENDING'
    `;

    // 3. Tables & Occupancy
    const tablesQuery = sql`
      SELECT 
        COUNT(id) AS totalTables,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupiedTables,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS availableTables
      FROM tables
      WHERE food_court_id = ${fcId}
    `;

    // 4. Dining Duration (in minutes)
    const diningDurationQuery = sql`
      SELECT 
        COALESCE(AVG(TIMESTAMPDIFF(MINUTE, started_at, updated_at)), 0) AS avgDuration
      FROM dining_sessions
      WHERE food_court_id = ${fcId}
        AND status = 'COMPLETED'
        AND started_at IS NOT NULL
        AND updated_at IS NOT NULL
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
    `;

    // 5. Tenants stats & kitchen workload
    const tenantsQuery = sql`
      SELECT 
        COUNT(id) AS totalTenants,
        SUM(CASE WHEN is_open = 1 THEN 1 ELSE 0 END) AS activeTenantsCount
      FROM tenants
      WHERE food_court_id = ${fcId}
    `;

    const topTenantsQuery = sql`
      SELECT 
        t.id AS tenantId,
        t.name AS name,
        t.stall_number AS stallNumber,
        COALESCE(SUM(to_ord.subtotal), 0) AS gmv,
        COUNT(to_ord.id) AS ordersCount,
        (
          SELECT COUNT(kq.id) 
          FROM kitchen_queues kq 
          JOIN tenant_orders t_sub ON kq.tenant_order_id = t_sub.id
          WHERE t_sub.tenant_id = t.id AND kq.status IN ('QUEUED', 'COOKING')
        ) AS activeCookingOrders
      FROM tenants t
      LEFT JOIN tenant_orders to_ord ON t.id = to_ord.tenant_id 
        AND to_ord.status = 'COMPLETED'
        AND to_ord.created_at >= ${startDate}
        AND to_ord.created_at <= ${endDate}
      WHERE t.food_court_id = ${fcId}
      GROUP BY t.id, t.name, t.stall_number
      ORDER BY gmv DESC
      LIMIT 10
    `;

    const kitchenOverviewQuery = sql`
      SELECT 
        COUNT(kq.id) AS totalActiveCooking
      FROM kitchen_queues kq
      JOIN tenant_orders to_ord ON kq.tenant_order_id = to_ord.id
      JOIN tenants t ON to_ord.tenant_id = t.id
      WHERE t.food_court_id = ${fcId}
        AND kq.status IN ('QUEUED', 'COOKING')
    `;

    const busiestTenantQuery = sql`
      SELECT 
        t.name AS name,
        COUNT(kq.id) AS activeCooking
      FROM kitchen_queues kq
      JOIN tenant_orders to_ord ON kq.tenant_order_id = to_ord.id
      JOIN tenants t ON to_ord.tenant_id = t.id
      WHERE t.food_court_id = ${fcId}
        AND kq.status IN ('QUEUED', 'COOKING')
      GROUP BY t.id, t.name
      ORDER BY activeCooking DESC
      LIMIT 1
    `;

    // 6. Channel breakdown
    const channelQuery = sql`
      SELECT 
        CASE 
          WHEN ds.kiosk_id IS NOT NULL THEN 'kiosk'
          WHEN ds.table_id IS NOT NULL THEN 'tableQr'
          ELSE 'cashierPos'
        END AS channel,
        COUNT(o.id) AS count
      FROM orders o
      JOIN dining_sessions ds ON o.session_id = ds.id
      WHERE o.order_status = 'COMPLETED'
        AND ds.food_court_id = ${fcId}
        AND o.created_at >= ${startDate}
        AND o.created_at <= ${endDate}
      GROUP BY channel
    `;

    // 7. Trends
    const trendsQuery = range === "today"
      ? sql`
        SELECT 
          DATE_FORMAT(o.created_at, '%H:00') AS timeLabel,
          COALESCE(SUM(o.total_amount), 0) AS hourlyRevenue,
          COUNT(o.id) AS orderCount
        FROM orders o
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE o.order_status = 'COMPLETED'
          AND ds.food_court_id = ${fcId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY timeLabel
        ORDER BY timeLabel ASC
      `
      : sql`
        SELECT 
          DATE_FORMAT(o.created_at, '%Y-%m-%d') AS timeLabel,
          COALESCE(SUM(o.total_amount), 0) AS hourlyRevenue,
          COUNT(o.id) AS orderCount
        FROM orders o
        JOIN dining_sessions ds ON o.session_id = ds.id
        WHERE o.order_status = 'COMPLETED'
          AND ds.food_court_id = ${fcId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY timeLabel
        ORDER BY timeLabel ASC
      `;

    const [
      currentRevRes,
      prevRevRes,
      pendingWithdrawalsRes,
      tablesRes,
      diningDurationRes,
      tenantsRes,
      topTenantsRes,
      kitchenOverviewRes,
      busiestTenantRes,
      channelRes,
      trendsRes,
    ] = await Promise.all([
      db.execute(currentRevQuery),
      db.execute(prevRevQuery),
      db.execute(pendingWithdrawalsQuery),
      db.execute(tablesQuery),
      db.execute(diningDurationQuery),
      db.execute(tenantsQuery),
      db.execute(topTenantsQuery),
      db.execute(kitchenOverviewQuery),
      db.execute(busiestTenantQuery),
      db.execute(channelQuery),
      db.execute(trendsQuery),
    ]);

    const currentRevRow = extractRows<any>(currentRevRes)[0] || {};
    const prevRevRow = extractRows<any>(prevRevRes)[0] || {};
    const pendingWithdrawalRow = extractRows<any>(pendingWithdrawalsRes)[0] || {};
    const tablesRow = extractRows<any>(tablesRes)[0] || {};
    const diningDurationRow = extractRows<any>(diningDurationRes)[0] || {};
    const tenantsRow = extractRows<any>(tenantsRes)[0] || {};
    const topTenantsRows = extractRows<any>(topTenantsRes);
    const kitchenOverviewRow = extractRows<any>(kitchenOverviewRes)[0] || {};
    const busiestTenantRow = extractRows<any>(busiestTenantRes)[0];
    const channelRows = extractRows<any>(channelRes);
    const trendsRows = extractRows<any>(trendsRes);

    const totalBranchRevenue = Number(currentRevRow.totalRevenue || 0);
    const completedOrdersCount = Number(currentRevRow.completedOrdersCount || 0);
    const prevRevenue = Number(prevRevRow.prevRevenue || 0);

    const revenueGrowthPercentage =
      prevRevenue > 0
        ? Number((((totalBranchRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
        : totalBranchRevenue > 0
        ? 100
        : 0;

    const totalTables = Number(tablesRow.totalTables || 0);
    const occupiedTables = Number(tablesRow.occupiedTables || 0);
    const availableTables = Number(tablesRow.availableTables || 0);
    const occupancyRatePercentage =
      totalTables > 0
        ? Number(((occupiedTables / totalTables) * 100).toFixed(1))
        : 0;

    const topTenants = topTenantsRows.map((t) => ({
      tenantId: t.tenantId,
      name: t.name,
      stallNumber: t.stallNumber,
      gmv: Number(t.gmv || 0),
      ordersCount: Number(t.ordersCount || 0),
      activeCookingOrders: Number(t.activeCookingOrders || 0),
    }));

    const busiestTenantName =
      busiestTenantRow && Number(busiestTenantRow.activeCooking || 0) > 0
        ? busiestTenantRow.name
        : "Semua dapur lancar";

    let tableQrCount = 0;
    let kioskCount = 0;
    let cashierPosCount = 0;
    for (const ch of channelRows) {
      const c = Number(ch.count || 0);
      if (ch.channel === "tableQr") tableQrCount += c;
      else if (ch.channel === "kiosk") kioskCount += c;
      else cashierPosCount += c;
    }
    const totalChannels = tableQrCount + kioskCount + cashierPosCount;

    return {
      foodCourtInfo: {
        id: fc.id,
        name: fc.name,
      },
      financialSummary: {
        totalBranchRevenue,
        revenueGrowthPercentage,
        branchWalletBalance: Number(fc.balance || 0),
        pendingTenantWithdrawals: {
          count: Number(pendingWithdrawalRow.count || 0),
          totalAmount: Number(pendingWithdrawalRow.totalAmount || 0),
        },
        completedOrdersCount,
      },
      floorAndTables: {
        totalTables,
        occupiedTables,
        availableTables,
        occupancyRatePercentage,
        averageDiningDurationMinutes: Number(
          Number(diningDurationRow.avgDuration || 0).toFixed(1)
        ),
      },
      tenantAndKitchen: {
        totalTenants: Number(tenantsRow.totalTenants || 0),
        activeTenantsCount: Number(tenantsRow.activeTenantsCount || 0),
        topTenants,
        kitchenQueueOverview: {
          totalActiveCooking: Number(kitchenOverviewRow.totalActiveCooking || 0),
          busiestTenantName,
        },
      },
      channelBreakdown: {
        tableQr: {
          count: tableQrCount,
          percentage:
            totalChannels > 0
              ? Number(((tableQrCount / totalChannels) * 100).toFixed(1))
              : 0,
        },
        kiosk: {
          count: kioskCount,
          percentage:
            totalChannels > 0
              ? Number(((kioskCount / totalChannels) * 100).toFixed(1))
              : 0,
        },
        cashierPos: {
          count: cashierPosCount,
          percentage:
            totalChannels > 0
              ? Number(((cashierPosCount / totalChannels) * 100).toFixed(1))
              : 0,
        },
      },
      trends: trendsRows.map((tr) => ({
        timeLabel: tr.timeLabel,
        hourlyRevenue: Number(tr.hourlyRevenue || 0),
        orderCount: Number(tr.orderCount || 0),
      })),
    };
  }
}

export const foodCourtStatsService = new FoodCourtStatsService();
