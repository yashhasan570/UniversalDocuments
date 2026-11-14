import { UniversalTaskStatus } from './universaldocuments-task'

export interface BulkOperationResponse {
  result: string
  task_id: string
}

export interface BulkOperationStatus {
  task_id: string
  operation: string
  status: UniversalTaskStatus
  error?: string
}
