# Food Court API - System Context Diagram

## High-Level System Context

```mermaid
graph TB
    subgraph "External Actors"
        Customer[👤 Customer/Pembeli<br/>- Scan QR meja<br/>- Pesan makanan<br/>- Bayar pesanan<br/>- Track status]
        Tenant[🏪 Tenant/Penjual<br/>- Kelola menu & stok<br/>- Proses dapur<br/>- Update status masak]
        AdminFC[👔 Admin Food Court<br/>- Kelola lokasi<br/>- Kelola meja<br/>- Kelola tenant]
        SuperAdmin[🔑 Super Admin<br/>- Full access<br/>- Kelola semua data]
        Kasir[💰 Kasir<br/>- Verifikasi pembayaran cash<br/>- Cetak struk]
    end

    subgraph "Food Court API System"
        API[🦊 Food Court API<br/>ElysiaJS + Bun<br/>Port 3000]
    end

    subgraph "External Systems"
        PaymentGateway[💳 Payment Gateway<br/>QRIS/E-Wallet<br/>Bank Transfer]
        QRScanner[📱 QR Scanner<br/>Mobile Device]
        KDS[🖥️ Kitchen Display<br/>Monitor Dapur]
    end

    subgraph "Data Storage"
        MySQL[(🗄️ MySQL Database<br/>19 Tables<br/>Drizzle ORM)]
    end

    Customer -->|REST API| API
    Tenant -->|REST API| API
    AdminFC -->|REST API| API
    SuperAdmin -->|REST API| API
    Kasir -->|REST API| API
    
    API -->|Query/Insert| MySQL
    API -->|Payment Request| PaymentGateway
    PaymentGateway -->|Payment Callback| API
    
    QRScanner -->|Scan Table QR| API
    KDS -->|Polling Orders| API
    
    API -->|Swagger Docs| Customer
    API -->|Swagger Docs| Tenant
```

---

## Detailed System Context with Features

```mermaid
graph LR
    subgraph "Users & Roles"
        C[Customer]
        T[Tenant]
        AFC[Admin FC]
        SA[Super Admin]
    end
    
    subgraph "Food Court API Core"
        direction TB
        Auth[🔐 Authentication<br/>JWT Token]
        FoodCourt[🏢 Food Courts<br/>Multi-location]
        Menu[🍔 Menus<br/>Stock Management]
        Table[🪑 Tables<br/>QR Tokens]
        Order[📋 Orders<br/>Multi-tenant]
        Payment[💰 Payments<br/>QRIS/Cash/Transfer]
        Kitchen[👨‍🍳 Kitchen Queue<br/>Cooking Status]
    end
    
    subgraph "Database Layer"
        DB[(MySQL<br/>19 Tables)]
    end
    
    C -->|Login/Register| Auth
    T -->|Login/Register| Auth
    AFC -->|Login/Register| Auth
    SA -->|Login/Register| Auth
    
    Auth -->|Authorize| FoodCourt
    Auth -->|Authorize| Menu
    Auth -->|Authorize| Table
    Auth -->|Authorize| Order
    Auth -->|Authorize| Payment
    Auth -->|Authorize| Kitchen
    
    FoodCourt --> DB
    Menu --> DB
    Table --> DB
    Order --> DB
    Payment --> DB
    Kitchen --> DB
    
    C -->|Browse & Order| Menu
    C -->|Scan QR| Table
    C -->|Place Order| Order
    C -->|Pay| Payment
    
    T -->|Manage| Menu
    T -->|Process| Kitchen
    T -->|Update Status| Order
    
    AFC -->|Manage| FoodCourt
    AFC -->|Manage| Table
    AFC -->|Monitor| Order
    
    SA -->|Full Control| FoodCourt
    SA -->|Full Control| Menu
    SA -->|Full Control| Order
```

---

## Data Flow Diagram - Order & Payment

```mermaid
sequenceDiagram
    actor Customer
    actor Tenant
    participant API as Food Court API
    participant DB as MySQL Database
    participant PG as Payment Gateway
    
    %% Order Flow
    Customer->>API: 1. Scan QR Code Meja
    API->>DB: Get Table Info
    DB-->>API: Table Data + QR Token
    API-->>Customer: Table Available
    
    Customer->>API: 2. Browse Menu Tenant
    API->>DB: Get Menus (with stock)
    DB-->>API: Menu List
    API-->>Customer: Display Menu
    
    Customer->>API: 3. POST /api/orders<br/>(items, tableId, quantity)
    API->>DB: Check Stock Availability
    DB-->>API: Stock OK
    API->>DB: Create Order (PENDING_PAYMENT)
    API->>DB: Create Dining Session
    API->>DB: Mark Table OCCUPIED
    API->>DB: Create Tenant Orders
    API->>DB: Create Kitchen Queue (QUEUED)
    DB-->>API: Order Created
    API-->>Customer: Order Number + Amount
    
    %% Payment Flow
    Customer->>API: 4. POST /api/payments<br/>(orderId, method: QRIS)
    API->>PG: Request Payment
    PG-->>API: Payment SUCCESS
    API->>DB: Update Payment Status PAID
    API->>DB: Update Order CONFIRMED
    API->>DB: Deduct Stock ⚡
    API->>DB: Update Menu Status if stock=0
    API->>DB: Update Kitchen Queue QUEUED
    DB-->>API: Payment Complete
    API-->>Customer: Payment Receipt
    
    %% Kitchen Flow
    API->>Tenant: 5. Kitchen Display<br/>New Order Alert
    Tenant->>API: PATCH /api/orders/tenant-orders/:id<br/>(status: PREPARING)
    API->>DB: Update Status PREPARING
    DB-->>API: Updated
    API-->>Tenant: Status Changed
    
    Tenant->>API: 6. PATCH /api/orders/tenant-orders/:id<br/>(status: READY)
    API->>DB: Update Status READY
    DB-->>API: Updated
    API-->>Tenant: Ready to Serve
    
    Tenant->>API: 7. PATCH /api/orders/tenant-orders/:id<br/>(status: COMPLETED)
    API->>DB: Update Status COMPLETED
    API->>DB: Check All Tenant Orders Complete
    API->>DB: Update Master Order COMPLETED
    API->>DB: Close Dining Session
    API->>DB: Free Table (AVAILABLE)
    DB-->>API: Order Completed
    API-->>Customer: Order Complete Notification
    
    %% Cancel Flow (Alternative)
    Note over Customer,DB: Alternative: Cancel Order
    Customer->>API: PATCH /api/orders/:id<br/>(status: CANCELLED)
    API->>DB: Check Payment Status
    alt Already PAID
        API->>DB: Restore Stock ⚡
        API->>DB: Update Menu Status AVAILABLE
    end
    API->>DB: Update Order CANCELLED
    API->>DB: Free Table
    DB-->>API: Order Cancelled
    API-->>Customer: Cancellation Confirmed
```

---

## Component Architecture

```mermaid
graph TB
    subgraph "Presentation Layer"
        Swagger[📖 Swagger UI<br/>/swagger]
        RestAPI[🔌 REST API Endpoints<br/>/api/*]
    end
    
    subgraph "Application Layer"
        direction LR
        AuthCtrl[Auth Controller]
        FCCtrl[Food Courts Controller]
        TenantCtrl[Tenants Controller]
        MenuCtrl[Menus Controller]
        TableCtrl[Tables Controller]
        OrderCtrl[Orders Controller]
        PaymentCtrl[Payments Controller]
    end
    
    subgraph "Business Logic Layer"
        direction LR
        AuthSvc[Auth Service]
        FCSvc[Food Court Service]
        TenantSvc[Tenant Service]
        MenuSvc[Menu Service<br/>⚡ Stock Management]
        TableSvc[Table Service]
        OrderSvc[Order Service<br/>⚡ Stock Reserve/Release]
        PaymentSvc[Payment Service<br/>⚡ Trigger Stock Deduct]
    end
    
    subgraph "Data Access Layer"
        DrizzleORM[Drizzle ORM<br/>Type-safe SQL Builder]
    end
    
    subgraph "Database"
        MySQL[(MySQL Database<br/>19 Tables)]
    end
    
    subgraph "Middleware"
        CORS[CORS]
        AuthMW[JWT Auth Middleware]
        RBAC[Role-Based Access Control]
        ErrorHandler[Global Error Handler]
    end
    
    Swagger --> RestAPI
    RestAPI --> CORS
    CORS --> AuthMW
    AuthMW --> RBAC
    RBAC --> AuthCtrl
    RBAC --> FCCtrl
    RBAC --> TenantCtrl
    RBAC --> MenuCtrl
    RBAC --> TableCtrl
    RBAC --> OrderCtrl
    RBAC --> PaymentCtrl
    
    AuthCtrl --> AuthSvc
    FCCtrl --> FCSvc
    TenantCtrl --> TenantSvc
    MenuCtrl --> MenuSvc
    TableCtrl --> TableSvc
    OrderCtrl --> OrderSvc
    PaymentCtrl --> PaymentSvc
    
    AuthSvc --> DrizzleORM
    FCSvc --> DrizzleORM
    TenantSvc --> DrizzleORM
    MenuSvc --> DrizzleORM
    TableSvc --> DrizzleORM
    OrderSvc --> DrizzleORM
    PaymentSvc --> DrizzleORM
    
    DrizzleORM --> MySQL
    
    RestAPI --> ErrorHandler
    ErrorHandler --> Swagger
```

---

## Database Entity Relationship (Simplified)

```mermaid
erDiagram
    USERS ||--o{ TENANTS : owns
    USERS ||--o{ FOOD_COURTS : manages
    
    FOOD_COURTS ||--o{ TABLES : has
    FOOD_COURTS ||--o{ TENANTS : located_in
    FOOD_COURTS ||--o{ DINING_SESSIONS : hosts
    
    TABLES ||--o{ DINING_SESSIONS : used_by
    
    DINING_SESSIONS ||--o{ SESSION_PARTICIPANTS : has
    DINING_SESSIONS ||--o{ ORDERS : contains
    
    ORDERS ||--o{ TENANT_ORDERS : split_into
    ORDERS ||--o{ PAYMENT_GROUPS : billed_as
    ORDERS ||--o{ ORDER_STATUS_LOGS : tracked_by
    
    TENANTS ||--o{ MENUS : sells
    TENANTS ||--o{ MENU_CATEGORIES : organizes
    TENANTS ||--o{ TENANT_ORDERS : receives
    
    MENUS ||--o{ MENU_OPTIONS : has
    MENUS ||--o{ ORDER_ITEMS : ordered_as
    
    TENANT_ORDERS ||--o{ ORDER_ITEMS : contains
    TENANT_ORDERS ||--|| KITCHEN_QUEUES : queued_in
    
    ORDER_ITEMS ||--o{ ORDER_ITEM_OPTIONS : customized_with
    ORDER_ITEMS ||--o{ PAYMENT_GROUP_ITEMS : allocated_to
    
    PAYMENT_GROUPS ||--o{ PAYMENT_GROUP_ITEMS : itemizes
    PAYMENT_GROUPS ||--o{ PAYMENTS : paid_by
    
    SESSION_PARTICIPANTS ||--o{ PAYMENT_GROUPS : responsible_for
    
    USERS {
        string id PK
        string name
        string email UK
        string password_hash
        enum role
    }
    
    MENUS {
        string id PK
        string tenant_id FK
        string name
        int price
        int stock "⚡ Stock Management"
        enum status "AUTO: OUT_OF_STOCK"
        boolean is_available
    }
    
    ORDERS {
        string id PK
        string session_id FK
        string order_number UK
        int total_amount
        enum payment_status
        enum order_status
    }
    
    TENANT_ORDERS {
        string id PK
        string order_id FK
        string tenant_id FK
        int subtotal
        enum status "QUEUED→PREPARING→READY→COMPLETED"
    }
    
    KITCHEN_QUEUES {
        string id PK
        string tenant_order_id FK
        string queue_number
        enum status
        timestamp queued_at
    }
```

---

## Stock Management Flow (New Feature)

```mermaid
stateDiagram-v2
    [*] --> MenuCreated: Create Menu<br/>(stock: 100)
    
    MenuCreated --> StockAvailable: stock > 0
    MenuCreated --> OutOfStock: stock = 0
    
    StockAvailable --> OrderValidation: Customer Order
    OrderValidation --> OrderCreated: quantity ≤ stock
    OrderValidation --> OrderRejected: quantity > stock
    
    OrderRejected --> [*]: Error Response
    
    OrderCreated --> PaymentPending: Order Status:<br/>PENDING_PAYMENT
    
    PaymentPending --> PaymentSuccess: Payment SUCCESS
    PaymentPending --> OrderCancelled: Timeout/Cancel
    
    PaymentSuccess --> StockDeducted: ⚡ reserveStock()
    StockDeducted --> StockAvailable: stock > 0
    StockDeducted --> OutOfStock: stock = 0
    
    OrderCancelled --> StockRestored: ⚡ releaseStock()<br/>(if already paid)
    StockRestored --> StockAvailable: stock > 0
    
    OutOfStock --> StockAvailable: Manual Update<br/>stock > 0
    
    StockAvailable --> OrderCompleted: Kitchen Process
    OrderCompleted --> [*]
    
    note right of StockDeducted
        Stock dikurangi HANYA
        setelah payment SUCCESS,
        bukan saat order dibuat
    end note
    
    note right of StockRestored
        Stock dikembalikan HANYA
        jika order sudah PAID
    end note
```

---

## Deployment Context

```mermaid
graph TB
    subgraph "Client Devices"
        Browser[🌐 Web Browser<br/>Swagger UI]
        Mobile[📱 Mobile App<br/>Customer/Tenant]
        KDS[🖥️ Kitchen Display<br/>Dapur]
        POS[💻 POS Terminal<br/>Kasir]
    end
    
    subgraph "Load Balancer"
        LB[Nginx/Caddy]
    end
    
    subgraph "Application Servers"
        App1[Bun Server 1<br/>Port 3000]
        App2[Bun Server 2<br/>Port 3001]
        App3[Bun Server N<br/>Port 300N]
    end
    
    subgraph "Database Cluster"
        Master[(MySQL Master<br/>Read/Write)]
        Replica1[(MySQL Replica 1<br/>Read Only)]
        Replica2[(MySQL Replica 2<br/>Read Only)]
    end
    
    subgraph "External Services"
        QRIS[💳 QRIS Gateway<br/>Midtrans/Xendit]
        Storage[☁️ Cloud Storage<br/>Menu Images]
    end
    
    Browser --> LB
    Mobile --> LB
    KDS --> LB
    POS --> LB
    
    LB --> App1
    LB --> App2
    LB --> App3
    
    App1 --> Master
    App2 --> Master
    App3 --> Master
    
    App1 -.Read.-> Replica1
    App2 -.Read.-> Replica2
    App3 -.Read.-> Replica1
    
    Master -.Replication.-> Replica1
    Master -.Replication.-> Replica2
    
    App1 --> QRIS
    App2 --> QRIS
    App3 --> QRIS
    
    App1 --> Storage
    App2 --> Storage
    App3 --> Storage
```

---

## Security Context

```mermaid
graph LR
    subgraph "Public Access"
        Public[Public Endpoints<br/>No Auth Required]
    end
    
    subgraph "Authenticated Access"
        Customer[Customer Role]
        Tenant[Tenant Role]
        AdminFC[Admin FC Role]
        Admin[Super Admin Role]
    end
    
    subgraph "API Resources"
        MenuRead[Read Menus]
        OrderTrack[Track Orders]
        TableScan[Scan QR]
        
        OrderCreate[Create Order]
        PaymentProcess[Process Payment]
        
        MenuManage[Manage Menus]
        KitchenUpdate[Update Kitchen]
        
        FCManage[Manage Food Court]
        TableManage[Manage Tables]
        
        FullAccess[Full System Access]
    end
    
    Public --> MenuRead
    Public --> OrderTrack
    Public --> TableScan
    
    Customer --> OrderCreate
    Customer --> PaymentProcess
    Customer --> MenuRead
    
    Tenant --> MenuManage
    Tenant --> KitchenUpdate
    Tenant --> MenuRead
    
    AdminFC --> FCManage
    AdminFC --> TableManage
    AdminFC --> MenuRead
    
    Admin --> FullAccess
    
    style Public fill:#90EE90
    style Customer fill:#87CEEB
    style Tenant fill:#FFD700
    style AdminFC fill:#FFA500
    style Admin fill:#FF6347
```

---

## Technology Stack Context

```mermaid
graph TB
    subgraph "Runtime"
        Bun[⚡ Bun 1.4.0<br/>JavaScript Runtime]
    end
    
    subgraph "Framework"
        Elysia[🦊 ElysiaJS<br/>Type-safe Web Framework]
    end
    
    subgraph "Database"
        MySQL[MySQL 8.0+]
        Drizzle[Drizzle ORM<br/>Type-safe SQL]
    end
    
    subgraph "Validation & Type Safety"
        TypeBox[TypeBox<br/>JSON Schema Validator]
        TypeScript[TypeScript<br/>Static Typing]
    end
    
    subgraph "Authentication"
        JWT[@elysiajs/jwt<br/>JWT Tokens]
    end
    
    subgraph "API Documentation"
        OpenAPI[@elysia/openapi<br/>Swagger Generator]
    end
    
    subgraph "Testing"
        BunTest[Bun Test Runner<br/>46 Tests]
    end
    
    Bun --> Elysia
    Elysia --> TypeBox
    Elysia --> JWT
    Elysia --> OpenAPI
    Elysia --> Drizzle
    Drizzle --> MySQL
    
    TypeScript --> Elysia
    BunTest --> Elysia
    
    style Bun fill:#fbf0df
    style Elysia fill:#e0f2fe
    style MySQL fill:#00758f
    style TypeScript fill:#3178c6
```

---

## Summary

### System Purpose
Food Court API adalah backend RESTful untuk mengelola operasional food court modern dengan fitur:
- Multi-tenant ordering (pesan dari banyak kios dalam 1 transaksi)
- Stock management otomatis
- Kitchen queue system
- Role-based access control
- Public order tracking

### Key Actors
1. **Customer**: Pesan, bayar, track pesanan
2. **Tenant**: Kelola menu & stok, proses dapur
3. **Admin Food Court**: Kelola lokasi & tenant
4. **Super Admin**: Full control sistem
5. **Kasir**: Verifikasi pembayaran cash

### Core Features
1. **Authentication**: JWT-based dengan 4 role
2. **Food Courts**: Multi-location management
3. **Menus**: Stock management dengan auto status
4. **Tables**: QR-based table ordering
5. **Orders**: Multi-tenant split orders
6. **Payments**: QRIS/Cash/Transfer
7. **Kitchen Queue**: Real-time cooking status

### Technology Highlights
- **Runtime**: Bun (fast JavaScript runtime)
- **Framework**: ElysiaJS (type-safe, high performance)
- **Database**: MySQL + Drizzle ORM (19 tables)
- **API Docs**: OpenAPI/Swagger
- **Testing**: 46 automated tests
