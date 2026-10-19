export interface SeriesValue {
  id: string;
  name: string;
  amount: number;
}

export interface Series {
  id: string;
  name: string;
  values: SeriesValue[];
}

export interface Participant {
  id: string;
  seriesId: string;
  name: string;
  payments: Record<string, number>; // valueId -> amount
  updatedAt: any; // Firestore Timestamp
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: any; // Firestore Timestamp
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}
