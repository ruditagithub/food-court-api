import { and, desc, eq, sql } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../../common/errors";
import { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import {
  foodCourts,
  menuCategories,
  menus,
  orderItems,
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

function parseDateRange(range: string = "7d"): DateRange {
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

export class TenantStatsService {
  /**
   * Get Tenant Stall Dashboard Statistics
   * GET /api/tenants/dashboard-stats?range=today|7d|30d|year
   */
  async getTenantDashboardStats(user: AuthUser, range: string = "7d", tenantIdParam?: string) {
    let tenant: any = null;

    if (user.role === "tenant") {
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.ownerId, user.id),
        with: { foodCourt: true },
      });
      if (!tenant) {
        throw new NotFoundError("Stan kios tenant tidak ditemukan untuk akun ini");
      }
    } else if (user.role === "admin") {
      if (tenantIdParam) {
        tenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, tenantIdParam),
          with: { foodCourt: true },
        });
      } else {
        tenant = await db.query.tenants.findFirst({
          with: { foodCourt: true },
        });
      }
      if (!tenant) {
        throw new NotFoundError("Tenant tidak ditemukan di sistem");
      }
    } else {
      throw new ForbiddenError("Hanya tenant yang dapat mengakses analitik stan ini");
    }

    const { startDate, endDate, prevStartDate, prevEndDate } = parseDateRange(range);
    const tenantId = tenant.id;

    // 1. Current Period Sales Summary
    const currentSalesQuery = sql`
      SELECT 
        COALESCE(SUM(subtotal), 0) AS totalRevenue,
        COUNT(id) AS totalCompletedOrders
      FROM tenant_orders
      WHERE tenant_id = ${tenantId}
        AND status = 'COMPLETED'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
    `;

    // 2. Previous Period Sales Summary (for growth %)
    const prevSalesQuery = sql`
      SELECT 
        COALESCE(SUM(subtotal), 0) AS prevRevenue
      FROM tenant_orders
      WHERE tenant_id = ${tenantId}
        AND status = 'COMPLETED'
        AND created_at >= ${prevStartDate}
        AND created_at < ${prevEndDate}
    `;

    // 3. Portions Sold in Current Period
    const portionsQuery = sql`
      SELECT 
        COALESCE(SUM(oi.quantity), 0) AS totalPortionsSold
      FROM order_items oi
      JOIN tenant_orders tord ON oi.tenant_order_id = tord.id
      WHERE tord.tenant_id = ${tenantId}
        AND tord.status = 'COMPLETED'
        AND tord.created_at >= ${startDate}
        AND tord.created_at <= ${endDate}
    `;

    // 4. Pending Withdrawals
    const pendingWithdrawalQuery = sql`
      SELECT 
        COALESCE(SUM(amount), 0) AS pendingAmount
      FROM withdrawal_requests
      WHERE tenant_id = ${tenantId}
        AND status = 'PENDING'
    `;

    // 5. Top 5 Selling Menus
    const topMenusQuery = sql`
      SELECT 
        oi.menu_id AS menuId,
        oi.menu_name_snapshot AS name,
        COALESCE(mc.name, 'Makanan Utama') AS categoryName,
        SUM(oi.quantity) AS portionsSold,
        SUM(oi.subtotal) AS revenue
      FROM order_items oi
      JOIN tenant_orders tord ON oi.tenant_order_id = tord.id
      LEFT JOIN menus m ON oi.menu_id = m.id
      LEFT JOIN menu_categories mc ON m.category_id = mc.id
      WHERE tord.tenant_id = ${tenantId}
        AND tord.status = 'COMPLETED'
        AND tord.created_at >= ${startDate}
        AND tord.created_at <= ${endDate}
      GROUP BY oi.menu_id, oi.menu_name_snapshot, mc.name
      ORDER BY portionsSold DESC
      LIMIT 5
    `;

    // 6. Category Distribution
    const categoryDistQuery = sql`
      SELECT 
        COALESCE(mc.name, 'Lain-lain') AS categoryName,
        COALESCE(SUM(oi.subtotal), 0) AS revenue
      FROM order_items oi
      JOIN tenant_orders tord ON oi.tenant_order_id = tord.id
      LEFT JOIN menus m ON oi.menu_id = m.id
      LEFT JOIN menu_categories mc ON m.category_id = mc.id
      WHERE tord.tenant_id = ${tenantId}
        AND tord.status = 'COMPLETED'
        AND tord.created_at >= ${startDate}
        AND tord.created_at <= ${endDate}
      GROUP BY mc.name
      ORDER BY revenue DESC
    `;

    // 7. Stock Alerts (Out of stock or unavailable menus)
    const stockAlertsQuery = sql`
      SELECT 
        m.id AS menuId,
        m.name AS name,
        COALESCE(mc.name, 'Menu') AS categoryName,
        CASE 
          WHEN m.status = 'OUT_OF_STOCK' THEN 'OUT_OF_STOCK'
          WHEN m.is_available = 0 THEN 'OUT_OF_STOCK'
          WHEN m.stock <= 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END AS status
      FROM menus m
      LEFT JOIN menu_categories mc ON m.category_id = mc.id
      WHERE m.tenant_id = ${tenantId}
        AND (m.status = 'OUT_OF_STOCK' OR m.is_available = 0 OR m.stock <= 0)
      LIMIT 10
    `;

    // 8. Peak Hours (Hourly aggregation)
    const hourlyQuery = sql`
      SELECT 
        DATE_FORMAT(created_at, '%H:00') AS hourLabel,
        COUNT(id) AS orderCount,
        COALESCE(SUM(subtotal), 0) AS revenue
      FROM tenant_orders
      WHERE tenant_id = ${tenantId}
        AND status = 'COMPLETED'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY hourLabel
      ORDER BY hourLabel ASC
    `;

    // 9. Daily Trends
    const dailyTrendsQuery = sql`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS dateStr,
        COALESCE(SUM(subtotal), 0) AS revenue,
        COUNT(id) AS orderCount
      FROM tenant_orders
      WHERE tenant_id = ${tenantId}
        AND status = 'COMPLETED'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY dateStr
      ORDER BY dateStr ASC
    `;

    // 10. Recent Withdrawals
    const recentWithdrawalsQuery = sql`
      SELECT 
        id,
        amount,
        status,
        requested_at AS requestedAt
      FROM withdrawal_requests
      WHERE tenant_id = ${tenantId}
      ORDER BY requested_at DESC
      LIMIT 5
    `;

    const [
      currentSalesRes,
      prevSalesRes,
      portionsRes,
      pendingWithdrawalRes,
      topMenusRes,
      categoryDistRes,
      stockAlertsRes,
      hourlyRes,
      dailyTrendsRes,
      recentWithdrawalsRes,
    ] = await Promise.all([
      db.execute(currentSalesQuery),
      db.execute(prevSalesQuery),
      db.execute(portionsQuery),
      db.execute(pendingWithdrawalQuery),
      db.execute(topMenusQuery),
      db.execute(categoryDistQuery),
      db.execute(stockAlertsQuery),
      db.execute(hourlyQuery),
      db.execute(dailyTrendsQuery),
      db.execute(recentWithdrawalsQuery),
    ]);

    const currentSalesRow = extractRows<any>(currentSalesRes)[0] || {};
    const prevSalesRow = extractRows<any>(prevSalesRes)[0] || {};
    const portionsRow = extractRows<any>(portionsRes)[0] || {};
    const pendingWithdrawalRow = extractRows<any>(pendingWithdrawalRes)[0] || {};

    const totalRevenue = Number(currentSalesRow.totalRevenue || 0);
    const totalCompletedOrders = Number(currentSalesRow.totalCompletedOrders || 0);
    const prevRevenue = Number(prevSalesRow.prevRevenue || 0);

    const revenueGrowthPercentage =
      prevRevenue > 0
        ? Number((((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
        : totalRevenue > 0
        ? 100
        : 0;

    const totalPortionsSold = Number(portionsRow.totalPortionsSold || 0);
    const averageOrderValue =
      totalCompletedOrders > 0
        ? Math.round(totalRevenue / totalCompletedOrders)
        : 0;

    // Process Top Menus & Popular Options
    const topMenusRows = extractRows<any>(topMenusRes);
    const topSellingMenus = await Promise.all(
      topMenusRows.map(async (m) => {
        const rev = Number(m.revenue || 0);
        let popularOption = "Standard / Tanpa Varian";
        if (m.menuId) {
          const optRes = await db.execute(sql`
            SELECT 
              oio.option_name_snapshot AS optName,
              COUNT(oio.id) AS optCount
            FROM order_item_options oio
            JOIN order_items oi ON oio.order_item_id = oi.id
            JOIN tenant_orders tord ON oi.tenant_order_id = tord.id
            WHERE tord.tenant_id = ${tenantId}
              AND oi.menu_id = ${m.menuId}
              AND tord.status = 'COMPLETED'
              AND tord.created_at >= ${startDate}
              AND tord.created_at <= ${endDate}
            GROUP BY oio.option_name_snapshot
            ORDER BY optCount DESC
            LIMIT 1
          `);
          const optRow = extractRows<any>(optRes)[0];
          if (optRow?.optName) {
            popularOption = optRow.optName;
          }
        }
        return {
          menuId: m.menuId || "",
          name: m.name,
          categoryName: m.categoryName,
          portionsSold: Number(m.portionsSold || 0),
          revenue: rev,
          contributionPercentage:
            totalRevenue > 0
              ? Number(((rev / totalRevenue) * 100).toFixed(1))
              : 0,
          popularOption,
        };
      })
    );

    // Process Category Distribution
    const catRows = extractRows<any>(categoryDistRes);
    const totalCatRevenue = catRows.reduce(
      (acc, cur) => acc + Number(cur.revenue || 0),
      0
    );
    const categoryDistribution = catRows.map((cat) => {
      const rev = Number(cat.revenue || 0);
      return {
        categoryName: cat.categoryName,
        revenue: rev,
        percentage:
          totalCatRevenue > 0
            ? Number(((rev / totalCatRevenue) * 100).toFixed(1))
            : 0,
      };
    });

    // Process Stock Alerts
    const stockAlerts = extractRows<any>(stockAlertsRes).map((s) => ({
      menuId: s.menuId,
      name: s.name,
      categoryName: s.categoryName,
      status: s.status || "OUT_OF_STOCK",
    }));

    // Process Hourly Breakdown & Peak Hour
    const hourlyRows = extractRows<any>(hourlyRes);
    const hourlyBreakdown = hourlyRows.map((h) => ({
      hourLabel: h.hourLabel,
      orderCount: Number(h.orderCount || 0),
      revenue: Number(h.revenue || 0),
    }));

    let maxOrderCount = -1;
    let peakHourLabel = "12:00";
    for (const h of hourlyBreakdown) {
      if (h.orderCount > maxOrderCount) {
        maxOrderCount = h.orderCount;
        peakHourLabel = h.hourLabel;
      }
    }
    let peakHour = "-";
    if (hourlyBreakdown.length > 0 && maxOrderCount > 0) {
      const peakHourStart = parseInt(peakHourLabel.split(":")[0], 10) || 12;
      peakHour = `${String(peakHourStart).padStart(2, "0")}:00 - ${String(
        peakHourStart + 1
      ).padStart(2, "0")}:00`;
    }

    // Process Daily Trends
    const dailyTrends = extractRows<any>(dailyTrendsRes).map((d) => ({
      date: d.dateStr,
      revenue: Number(d.revenue || 0),
      orderCount: Number(d.orderCount || 0),
    }));

    // Process Recent Withdrawals
    const recentWithdrawals = extractRows<any>(recentWithdrawalsRes).map((w) => ({
      id: w.id,
      amount: Number(w.amount || 0),
      status: w.status,
      requestedAt: w.requestedAt ? new Date(w.requestedAt).toISOString() : "",
    }));

    return {
      tenantInfo: {
        id: tenant.id,
        name: tenant.name,
        stallNumber: tenant.stallNumber,
        foodCourtName: tenant.foodCourt?.name || "Amici Food Court",
      },
      summary: {
        totalRevenue,
        revenueGrowthPercentage,
        walletBalance: Number(tenant.balance || 0),
        pendingWithdrawal: Number(pendingWithdrawalRow.pendingAmount || 0),
        totalPortionsSold,
        averageOrderValue,
        totalCompletedOrders,
      },
      menuIntelligence: {
        topSellingMenus,
        categoryDistribution,
        stockAlerts,
      },
      peakHoursAndTrends: {
        peakHour,
        hourlyBreakdown,
        dailyTrends,
      },
      recentWithdrawals,
    };
  }
}

export const tenantStatsService = new TenantStatsService();
