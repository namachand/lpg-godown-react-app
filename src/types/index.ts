export type DriverStats = {
  allocated: number;
  delivered: number;
  collection: number;
  empties: number;
  inHand: number;
  newDelivery: number;
};

export type DriverDeliveryItem = {
  saleId: number;
  customerName: string;
  address: string;
  product: string;
  quantity: number;
  rawStatus: 'PENDING' | 'ASSIGNED' | 'DELIVERED' | 'CANCELLED';
  status: 'Pending' | 'Delivered' | 'Cancelled';
  totalAmount: number;
  createdAt: string;
  deliveredAt?: string | null;
  paymentMode?: string;
  cylinderType?: string;
  showMarkDelivered: boolean;
};

export type DriverDeliveriesResponse = {
  flag?: string | null;
  stats: DriverStats;
  deliveries: DriverDeliveryItem[];
};

export type SettlementItem = {
  id: number;
  settlementId: number;
  customerName: string;
  amount: number;
  createdAt: string;
  method: "CASH" | "UPI";
  status: "PENDING" | "SETTLED";
};

export type CollectionSummaryResponse = {
  summary: {
    cashCollected: number;
    upiCollected: number;
    totalCollected: number;
  };
  settlements: {
    cash: SettlementItem[];
    upi: SettlementItem[];
  };
};

export type InHandReturnRequest = {
  id: number;
  productId: number;
  stockAreaId: number;
  quantity: number;
  productName: string;
  createdAt: string;
  isApproved: number;
};

export type InHandSummaryResponse = {
  summary: {
    allocated: number;
    delivered: number;
    inHand: number;
  };
  returnRequests: InHandReturnRequest[];
};

export type CollectionHistoryTransaction = {
  saleId: number;
  customerName: string;
  amount: number;
  paymentMode: string;
  deliveredAt: string;
  status: "Paid";
};

export type CollectionHistoryDayItem = {
  date: string;
  totalAmount: number;
  summary: {
    cash: {
      amount: number;
      status: "PENDING" | "SETTLED";
      settledAt: string | null;
    };
    upi: {
      amount: number;
      status: "PENDING" | "SETTLED";
      settledAt: string | null;
    };
  };
  transactions: CollectionHistoryTransaction[];
};

export type CollectionHistoryResponse = {
  items: CollectionHistoryDayItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type EmptyCylinderCollectedItem = {
  id: number;
  customerName: string;
  productType: string;
  quantity: number;
  createdAt: string;
};

export type EmptyCylinderReturnRequestItem = {
  id: number;
  quantity: number;
  createdAt: string;
  isApproved: number;
};

export type EmptyCylindersTodayResponse = {
  summary: {
    collected: number;
    returned: number;
    inHand: number;
  };
  collectedFrom: EmptyCylinderCollectedItem[];
  returnRequests: EmptyCylinderReturnRequestItem[];
};

export type EmptyCylinderHistoryItem = {
  date: string;
  collected: number;
  returned: number;
};

export type EmptyCylindersHistoryResponse = {
  items: EmptyCylinderHistoryItem[];
};

export type DriverProfileHistoryDelivery = {
  saleId: number;
  customerName: string;
  address: string;
  cylinderType: string;
  quantity: number;
  totalAmount: number;
  paymentMode: string;
  deliveredAt: string;
};

export type DriverProfileHistoryDayItem = {
  date: string;
  totalAmount: number;
  totalDeliveries: number;
  deliveries: DriverProfileHistoryDelivery[];
};

export type DriverProfileHistoryResponse = {
  performance: {
    today: number;
    thisWeek: number;
    total: number;
  };
  items: DriverProfileHistoryDayItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type ProductSearchItem = {
  id: number;
  name: string;
  type: 'DOMESTIC' | 'COMMERCIAL';
  price: number;
  categoryName: string;
};