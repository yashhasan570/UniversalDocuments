import { ObjectWithId } from './object-with-id'

export enum UniversalTaskType {
  ConsumeFile = 'consume_file',
  TrainClassifier = 'train_classifier',
  SanityCheck = 'sanity_check',
  MailFetch = 'mail_fetch',
  LlmIndex = 'llm_index',
  EmptyTrash = 'empty_trash',
  CheckWorkflows = 'check_workflows',
  BulkUpdate = 'bulk_update',
  ReprocessDocument = 'reprocess_document',
  BuildShareLink = 'build_share_link',
  BulkDelete = 'bulk_delete',
  ApplyAiSuggestions = 'apply_ai_suggestions',
}

export enum UniversalTaskTriggerSource {
  Scheduled = 'scheduled',
  WebUI = 'web_ui',
  ApiUpload = 'api_upload',
  FolderConsume = 'folder_consume',
  EmailConsume = 'email_consume',
  System = 'system',
  Manual = 'manual',
}

export enum UniversalTaskStatus {
  Pending = 'pending',
  Started = 'started',
  Success = 'success',
  Failure = 'failure',
  Revoked = 'revoked',
}

export interface UniversalTask extends ObjectWithId {
  task_id: string
  task_type: UniversalTaskType
  task_type_display: string
  trigger_source: UniversalTaskTriggerSource
  trigger_source_display: string
  status: UniversalTaskStatus
  status_display: string
  date_created: Date
  date_started?: Date
  date_done?: Date
  duration_seconds?: number
  wait_time_seconds?: number
  input_data: Record<string, any>
  result_data?: Record<string, any>
  related_document_ids: number[]
  acknowledged: boolean
  owner?: number
}

export interface UniversalTaskSummary {
  task_type: UniversalTaskType
  total_count: number
  pending_count: number
  success_count: number
  failure_count: number
  avg_duration_seconds: number | null
  avg_wait_time_seconds: number | null
  last_run: Date | null
  last_success: Date | null
  last_failure: Date | null
}

export interface UniversalTaskStatusCounts {
  all: number
  needs_attention: number
  in_progress: number
  completed: number
}
