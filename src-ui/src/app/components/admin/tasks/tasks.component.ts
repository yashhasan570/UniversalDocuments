import { JsonPipe, NgTemplateOutlet } from '@angular/common'
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  NgbCollapseModule,
  NgbDropdownModule,
  NgbModal,
  NgbPaginationModule,
  NgbPopoverModule,
} from '@ng-bootstrap/ng-bootstrap'
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  first,
  forkJoin,
  map,
  Observable,
  Subject,
  takeUntil,
  timer,
} from 'rxjs'
import { BootstrapIconComponent } from 'src/app/components/common/bootstrap-icon/bootstrap-icon.component'
import {
  UniversalTask,
  UniversalTaskStatus,
  UniversalTaskTriggerSource,
  UniversalTaskType,
} from 'src/app/data/universaldocuments-task'
import { Results } from 'src/app/data/results'
import { IfPermissionsDirective } from 'src/app/directives/if-permissions.directive'
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe'
import { TasksService } from 'src/app/services/tasks.service'
import { ToastService } from 'src/app/services/toast.service'
import {
  documentOperationHasFollowUpTasks,
  getDocumentOperationLabel,
} from 'src/app/utils/document-operation'
import { ConfirmDialogComponent } from '../../common/confirm-dialog/confirm-dialog.component'
import { PageHeaderComponent } from '../../common/page-header/page-header.component'
import { LoadingComponentWithPermissions } from '../../loading-component/loading.component'

export enum TaskSection {
  All = 'all',
  NeedsAttention = 'needs_attention',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export enum TaskFilterTargetID {
  Name,
  Result,
  TaskId,
}

const FILTER_TARGETS = [
  { id: TaskFilterTargetID.Name, name: $localize`Name` },
  { id: TaskFilterTargetID.Result, name: $localize`Result` },
  { id: TaskFilterTargetID.TaskId, name: $localize`Task ID` },
]

const SECTION_LABELS = {
  [TaskSection.All]: $localize`All`,
  [TaskSection.NeedsAttention]: $localize`Needs attention`,
  [TaskSection.InProgress]: $localize`In progress`,
  [TaskSection.Completed]: $localize`Recently completed`,
}

const TASK_TYPE_OPTIONS: Array<{
  value: UniversalTaskType
  label: string
}> = [
  {
    value: UniversalTaskType.ConsumeFile,
    label: $localize`Consume File`,
  },
  {
    value: UniversalTaskType.TrainClassifier,
    label: $localize`Train Classifier`,
  },
  {
    value: UniversalTaskType.SanityCheck,
    label: $localize`Sanity Check`,
  },
  { value: UniversalTaskType.MailFetch, label: $localize`Mail Fetch` },
  { value: UniversalTaskType.LlmIndex, label: $localize`LLM Index` },
  {
    value: UniversalTaskType.EmptyTrash,
    label: $localize`Empty Trash`,
  },
  {
    value: UniversalTaskType.CheckWorkflows,
    label: $localize`Check Workflows`,
  },
  {
    value: UniversalTaskType.BulkUpdate,
    label: $localize`Bulk Update`,
  },
  {
    value: UniversalTaskType.ReprocessDocument,
    label: $localize`Reprocess Document`,
  },
  {
    value: UniversalTaskType.BuildShareLink,
    label: $localize`Build Share Link`,
  },
  {
    value: UniversalTaskType.BulkDelete,
    label: $localize`Bulk Delete`,
  },
  {
    value: UniversalTaskType.ApplyAiSuggestions,
    label: $localize`Apply AI Suggestions`,
  },
]

const TRIGGER_SOURCE_OPTIONS: Array<{
  value: UniversalTaskTriggerSource
  label: string
}> = [
  {
    value: UniversalTaskTriggerSource.Scheduled,
    label: $localize`Scheduled`,
  },
  { value: UniversalTaskTriggerSource.WebUI, label: $localize`Web UI` },
  {
    value: UniversalTaskTriggerSource.ApiUpload,
    label: $localize`API Upload`,
  },
  {
    value: UniversalTaskTriggerSource.FolderConsume,
    label: $localize`Folder Consume`,
  },
  {
    value: UniversalTaskTriggerSource.EmailConsume,
    label: $localize`Email Consume`,
  },
  { value: UniversalTaskTriggerSource.System, label: $localize`System` },
  { value: UniversalTaskTriggerSource.Manual, label: $localize`Manual` },
]

@Component({
  selector: 'pngx-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  imports: [
    PageHeaderComponent,
    IfPermissionsDirective,
    CustomDatePipe,
    JsonPipe,
    FormsModule,
    ReactiveFormsModule,
    NgTemplateOutlet,
    RouterLink,
    NgbCollapseModule,
    NgbDropdownModule,
    NgbPaginationModule,
    NgbPopoverModule,
    BootstrapIconComponent,
  ],
})
export class TasksComponent
  extends LoadingComponentWithPermissions
  implements OnInit, OnDestroy
{
  tasksService = inject(TasksService)
  private modalService = inject(NgbModal)
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly toastService = inject(ToastService)

  readonly TaskSection = TaskSection
  readonly sections = [
    TaskSection.NeedsAttention,
    TaskSection.InProgress,
    TaskSection.Completed,
  ]
  public selectedTasks: Set<number> = new Set()
  public expandedTask: number
  public autoRefreshEnabled: boolean = true
  public readonly pageSize = 25
  public readonly overviewSize = 10
  public page: number = 1
  readonly totalTasks = signal(0)
  readonly sectionCounts = signal<Record<TaskSection, number>>({
    [TaskSection.All]: 0,
    [TaskSection.NeedsAttention]: 0,
    [TaskSection.InProgress]: 0,
    [TaskSection.Completed]: 0,
  })
  readonly pagedTasks = signal<UniversalTask[]>([])
  public selectedSection: TaskSection = TaskSection.All
  public selectedTaskType: UniversalTaskType | null = null
  public selectedTriggerSource: UniversalTaskTriggerSource | null = null

  private _filterText: string = ''
  get filterText() {
    return this._filterText
  }
  set filterText(value: string) {
    this.filterDebounce.next(value)
  }

  public filterTargetID: TaskFilterTargetID = TaskFilterTargetID.Name
  public get filterTargetName(): string {
    return FILTER_TARGETS.find((t) => t.id == this.filterTargetID).name
  }
  private filterDebounce: Subject<string> = new Subject<string>()

  public get filterTargets(): Array<{ id: number; name: string }> {
    return FILTER_TARGETS
  }

  public get taskTypeOptions(): Array<{
    value: UniversalTaskType
    label: string
  }> {
    return TASK_TYPE_OPTIONS
  }

  public get triggerSourceOptions(): Array<{
    value: UniversalTaskTriggerSource
    label: string
  }> {
    return TRIGGER_SOURCE_OPTIONS
  }

  public get selectedTaskTypeLabel(): string {
    if (this.selectedTaskType === null) {
      return $localize`All types`
    }

    return (
      this.taskTypeOptions.find(
        (option) => option.value === this.selectedTaskType
      )?.label ?? this.selectedTaskType
    )
  }

  public get selectedTriggerSourceLabel(): string {
    if (this.selectedTriggerSource === null) {
      return $localize`All sources`
    }

    return (
      this.triggerSourceOptions.find(
        (option) => option.value === this.selectedTriggerSource
      )?.label ?? this.selectedTriggerSource
    )
  }

  get dismissButtonText(): string {
    return this.selectedTasks.size > 0
      ? $localize`Dismiss selected`
      : $localize`Dismiss visible`
  }

  get visibleSections(): TaskSection[] {
    const sections =
      this.selectedSection === TaskSection.All
        ? this.sections
        : [this.selectedSection]

    return sections.filter(
      (section) => this.tasksForSection(section).length > 0
    )
  }

  get visibleTasks(): UniversalTask[] {
    return this.visibleSections.flatMap((section) =>
      this.tasksForSection(section)
    )
  }

  get isFiltered(): boolean {
    return (
      this.selectedTaskType !== null ||
      this.selectedTriggerSource !== null ||
      this._filterText.length > 0
    )
  }

  ngOnInit() {
    const taskId = this.route.snapshot.queryParamMap.get('task_id')
    if (taskId) {
      this.filterTargetID = TaskFilterTargetID.TaskId
      this._filterText = taskId
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { task_id: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
    }
    this.tasksService.reload()
    this.reloadPage()
    timer(5000, 5000)
      .pipe(
        filter(() => this.autoRefreshEnabled),
        takeUntil(this.unsubscribeNotifier)
      )
      .subscribe(() => {
        this.tasksService.reload()
        this.reloadPage(false)
      })

    this.filterDebounce
      .pipe(
        takeUntil(this.unsubscribeNotifier),
        debounceTime(100),
        distinctUntilChanged(),
        filter((query) => !query.length || query.length > 2)
      )
      .subscribe((query) => {
        this._filterText = query
        this.clearSelection()
        this.reloadPage(true)
      })
  }

  ngOnDestroy() {
    super.ngOnDestroy()
    this.tasksService.cancelPending()
  }

  dismissTask(task: UniversalTask) {
    this.dismissTasks(task)
  }

  dismissTasks(task: UniversalTask = undefined) {
    let tasks = task ? new Set([task.id]) : new Set(this.selectedTasks.values())
    if (!task && tasks.size == 0) {
      tasks = new Set(this.visibleTasks.map((t) => t.id))
    }

    if (tasks.size > 1) {
      let modal = this.modalService.open(ConfirmDialogComponent, {
        backdrop: 'static',
      })
      modal.componentInstance.title = $localize`Confirm Dismiss`
      modal.componentInstance.messageBold = $localize`Dismiss ${tasks.size} tasks?`
      modal.componentInstance.btnClass = 'btn-warning'
      modal.componentInstance.btnCaption = $localize`Dismiss`
      modal.componentInstance.confirmClicked.pipe(first()).subscribe(() => {
        modal.componentInstance.buttonsEnabled.set(false)
        modal.close()
        this.tasksService.dismissTasks(tasks).subscribe({
          next: () => {
            this.reloadPage(false)
          },
          error: (e) => {
            this.toastService.showError($localize`Error dismissing tasks`, e)
            modal.componentInstance.buttonsEnabled.set(true)
          },
        })
        this.clearSelection()
      })
    } else if (tasks.size === 1) {
      this.tasksService.dismissTasks(tasks).subscribe({
        next: () => {
          this.reloadPage(false)
        },
        error: (e) =>
          this.toastService.showError($localize`Error dismissing task`, e),
      })
      this.clearSelection()
    }
  }

  dismissAllTasks() {
    let modal = this.modalService.open(ConfirmDialogComponent, {
      backdrop: 'static',
    })
    modal.componentInstance.title = $localize`Confirm Dismiss All`
    modal.componentInstance.messageBold = $localize`Dismiss all ${this.totalTasks()} tasks?`
    modal.componentInstance.btnClass = 'btn-warning'
    modal.componentInstance.btnCaption = $localize`Dismiss`
    modal.componentInstance.confirmClicked.pipe(first()).subscribe(() => {
      modal.componentInstance.buttonsEnabled.set(false)
      modal.close()
      this.tasksService.dismissAllTasks().subscribe({
        next: () => {
          this.reloadPage(false)
        },
        error: (e) => {
          this.toastService.showError($localize`Error dismissing tasks`, e)
          modal.componentInstance.buttonsEnabled.set(true)
        },
      })
      this.clearSelection()
    })
  }

  expandTask(task: UniversalTask) {
    this.expandedTask = this.expandedTask == task.id ? undefined : task.id
  }

  toggleSelected(task: UniversalTask) {
    this.selectedTasks.has(task.id)
      ? this.selectedTasks.delete(task.id)
      : this.selectedTasks.add(task.id)
  }

  toggleSection(section: TaskSection, event: PointerEvent) {
    const sectionTasks = this.tasksForSection(section)
    if ((event.target as HTMLInputElement).checked) {
      sectionTasks.forEach((task) => this.selectedTasks.add(task.id))
    } else {
      sectionTasks.forEach((task) => this.selectedTasks.delete(task.id))
    }
  }

  areAllSelected(tasks: UniversalTask[]): boolean {
    return (
      tasks.length > 0 && tasks.every((task) => this.selectedTasks.has(task.id))
    )
  }

  taskDisplayName(task: UniversalTask): string {
    const filename = task.input_data?.filename?.toString()
    if (filename) return filename
    const operation = this.taskOperationLabel(task)
    const count = this.taskDocumentCount(task)
    if (operation && count !== null && count > 1) {
      return $localize`Bulk operation: ${operation}`
    }
    return operation || task.task_type_display
  }

  taskShowsSeparateTypeLabel(task: UniversalTask): boolean {
    return (
      !this.taskOperationLabel(task) &&
      this.taskDisplayName(task) !== task.task_type_display
    )
  }

  private taskOperationLabel(task: UniversalTask): string | null {
    return getDocumentOperationLabel(task.input_data?.operation)
  }

  taskDocumentCount(task: UniversalTask): number | null {
    const count = task.input_data?.document_count
    return Number.isInteger(count) && count >= 0 ? count : null
  }

  taskResultMessage(task: UniversalTask): string | null {
    if (!task.result_data) {
      return null
    }

    const documentId = task.result_data?.['document_id']
    if (typeof documentId === 'number') {
      return $localize`Success. New document id ${documentId} created`
    }

    const reason = task.result_data?.['reason']
    if (typeof reason === 'string') {
      return reason
    }

    const duplicateOf = task.result_data?.['duplicate_of']
    if (typeof duplicateOf === 'number') {
      return $localize`Duplicate of document #${duplicateOf}`
    }

    const errorMessage = task.result_data?.['error_message']
    if (typeof errorMessage === 'string') {
      return errorMessage
    }

    if (
      task.status === UniversalTaskStatus.Success &&
      this.taskOperationLabel(task)
    ) {
      return documentOperationHasFollowUpTasks(task.input_data?.operation)
        ? $localize`Submitted for processing`
        : $localize`Completed`
    }

    return null
  }

  taskResultPreview(task: UniversalTask): string | null {
    const message = this.taskResultMessage(task)
    if (!message) {
      return null
    }

    return message.length > 50 ? `${message.slice(0, 50)}...` : message
  }

  taskHasLongResultMessage(task: UniversalTask): boolean {
    return (this.taskResultMessage(task)?.length ?? 0) > 50
  }

  taskHasResultMessage(task: UniversalTask): boolean {
    return !!this.taskResultMessage(task)
  }

  duplicateDocumentId(task: UniversalTask): number | null {
    const duplicateOf = task.result_data?.['duplicate_of']
    return typeof duplicateOf === 'number' ? duplicateOf : null
  }

  duplicateTaskLabel(task: UniversalTask): string {
    return $localize`Duplicate of document #${this.duplicateDocumentId(task)}`
  }

  openDuplicateDocument(documentId: number) {
    this.router.navigate(['documents', documentId, 'details'])
  }

  taskResultPopoverMessage(task: UniversalTask): string {
    return this.taskResultMessage(task)?.slice(0, 300) ?? ''
  }

  taskResultMessageOverflowsPopover(task: UniversalTask): boolean {
    return (this.taskResultMessage(task)?.length ?? 0) > 300
  }

  tasksForSection(section: TaskSection): UniversalTask[] {
    let tasks = this.pagedTasks().filter((task) =>
      this.taskBelongsToSection(task, section)
    )

    return tasks.filter((task) => this.taskMatchesCurrentFilters(task))
  }

  sectionLabel(section: TaskSection): string {
    return SECTION_LABELS[section]
  }

  sectionCount(section: TaskSection): number {
    return this.sectionCounts()[section]
  }

  sectionShowsResults(section: TaskSection): boolean {
    return section !== TaskSection.InProgress
  }

  setSection(section: TaskSection) {
    this.selectedSection = section
    this.clearSelection()
    this.reloadPage(true)
  }

  setTaskType(taskType: UniversalTaskType | null) {
    this.selectedTaskType = taskType
    this.clearSelection()
    this.reloadPage(true)
  }

  setTriggerSource(triggerSource: UniversalTaskTriggerSource | null) {
    this.selectedTriggerSource = triggerSource
    this.clearSelection()
    this.reloadPage(true)
  }

  setFilterTarget(filterTargetID: TaskFilterTargetID) {
    this.filterTargetID = filterTargetID
    if (this._filterText.length) {
      this.clearSelection()
      this.reloadPage(true)
    }
  }

  taskTypeOptionCount(taskType: UniversalTaskType | null): number {
    return this.tasksForOptionCounts({ taskType }).length
  }

  triggerSourceOptionCount(
    triggerSource: UniversalTaskTriggerSource | null
  ): number {
    return this.tasksForOptionCounts({ triggerSource }).length
  }

  isTaskTypeOptionDisabled(taskType: UniversalTaskType | null): boolean {
    return this.taskTypeOptionCount(taskType) === 0
  }

  isTriggerSourceOptionDisabled(
    triggerSource: UniversalTaskTriggerSource | null
  ): boolean {
    return this.triggerSourceOptionCount(triggerSource) === 0
  }

  clearSelection() {
    this.selectedTasks.clear()
  }

  setPage(page: number) {
    if (this.page === page) {
      return
    }

    this.page = page
    this.clearSelection()
    this.reloadPage()
  }

  public resetFilter() {
    if (!this._filterText.length) {
      return
    }

    this._filterText = ''
    this.clearSelection()
    this.reloadPage(true)
  }

  public resetFilters() {
    const hadFilter = this.isFiltered
    this.selectedTaskType = null
    this.selectedTriggerSource = null
    this._filterText = ''
    this.clearSelection()

    if (hadFilter) {
      this.reloadPage(true)
    }
  }

  filterInputKeyup(event: KeyboardEvent) {
    if (event.key == 'Enter') {
      this._filterText = (event.target as HTMLInputElement).value
      this.clearSelection()
      this.reloadPage(true)
    } else if (event.key === 'Escape') {
      this.resetFilter()
    }
  }

  private taskBelongsToSection(
    task: UniversalTask,
    section: TaskSection
  ): boolean {
    switch (section) {
      case TaskSection.NeedsAttention:
        return [
          UniversalTaskStatus.Failure,
          UniversalTaskStatus.Revoked,
        ].includes(task.status)
      case TaskSection.InProgress:
        return [
          UniversalTaskStatus.Pending,
          UniversalTaskStatus.Started,
        ].includes(task.status)
      case TaskSection.Completed:
        return task.status === UniversalTaskStatus.Success
    }
  }

  private taskMatchesCurrentFilters(task: UniversalTask): boolean {
    return this.taskMatchesFilters(task, {
      taskType: this.selectedTaskType,
      triggerSource: this.selectedTriggerSource,
    })
  }

  private taskMatchesFilters(
    task: UniversalTask,
    {
      taskType,
      triggerSource,
    }: {
      taskType: UniversalTaskType | null
      triggerSource: UniversalTaskTriggerSource | null
    }
  ): boolean {
    if (taskType !== null && task.task_type !== taskType) {
      return false
    }

    if (triggerSource !== null && task.trigger_source !== triggerSource) {
      return false
    }

    if (!this._filterText.length) {
      return true
    }

    const query = this._filterText.toLowerCase()

    if (this.filterTargetID === TaskFilterTargetID.TaskId) {
      return task.task_id.toLowerCase() === query
    }

    // Text filtering now handled API-side
    return true
  }

  private tasksForOptionCounts({
    taskType = this.selectedTaskType,
    triggerSource = this.selectedTriggerSource,
  }: {
    taskType?: UniversalTaskType | null
    triggerSource?: UniversalTaskTriggerSource | null
  }): UniversalTask[] {
    const sections =
      this.selectedSection === TaskSection.All
        ? this.sections
        : [this.selectedSection]

    return this.pagedTasks().filter(
      (task) =>
        sections.some((section) => this.taskBelongsToSection(task, section)) &&
        this.taskMatchesFilters(task, { taskType, triggerSource })
    )
  }

  private reloadSectionCounts() {
    this.tasksService
      .statusCounts(this.getParamsForSection(TaskSection.All))
      .pipe(first(), takeUntil(this.unsubscribeNotifier))
      .subscribe((counts) => {
        this.sectionCounts.set({
          [TaskSection.All]: counts.all,
          [TaskSection.NeedsAttention]: counts.needs_attention,
          [TaskSection.InProgress]: counts.in_progress,
          [TaskSection.Completed]: counts.completed,
        })
      })
  }

  private getParamsForSection(
    section: TaskSection
  ): Record<string, string | number | boolean | readonly string[]> {
    const params: Record<
      string,
      string | number | boolean | readonly string[]
    > = {
      acknowledged: false,
    }

    const statuses = this.statusesForSection(section)
    if (statuses.length) {
      params.status = statuses
    }

    if (this.selectedTaskType !== null) {
      params.task_type = this.selectedTaskType
    }

    if (this.selectedTriggerSource !== null) {
      params.trigger_source = this.selectedTriggerSource
    }

    if (this._filterText.length) {
      const parameter = {
        [TaskFilterTargetID.Name]: 'name',
        [TaskFilterTargetID.Result]: 'result',
        [TaskFilterTargetID.TaskId]: 'task_id',
      }[this.filterTargetID]
      params[parameter] = this._filterText
      if (this.filterTargetID === TaskFilterTargetID.TaskId) {
        delete params.acknowledged
      }
    }

    return params
  }

  private statusesForSection(section: TaskSection): UniversalTaskStatus[] {
    switch (section) {
      case TaskSection.NeedsAttention:
        return [UniversalTaskStatus.Failure, UniversalTaskStatus.Revoked]
      case TaskSection.InProgress:
        return [UniversalTaskStatus.Pending, UniversalTaskStatus.Started]
      case TaskSection.Completed:
        return [UniversalTaskStatus.Success]
      default:
        return []
    }
  }

  private reloadPage(resetToFirstPage: boolean = false) {
    if (resetToFirstPage) {
      this.page = 1
    }

    this.reloadSectionCounts()

    this.loading.set(true)
    this.listTasks()
      .pipe(first(), takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (result) => {
          this.pagedTasks.set(result.results)
          this.totalTasks.set(result.count)
          this.loading.set(false)
          if (
            this.page > 1 &&
            this.pagedTasks().length === 0 &&
            this.totalTasks() > 0
          ) {
            this.page -= 1
            this.reloadPage()
          }
        },
        error: () => {
          this.loading.set(false)
        },
      })
  }

  private listTasks(): Observable<Results<UniversalTask>> {
    if (this.selectedSection !== TaskSection.All) {
      return this.tasksService.list(
        this.page,
        this.pageSize,
        this.getParamsForSection(this.selectedSection)
      )
    }

    // All is an overview of each section to avoid splitting sections across pages
    return forkJoin(
      this.sections.map((section) =>
        this.tasksService.list(
          1,
          this.overviewSize,
          this.getParamsForSection(section)
        )
      )
    ).pipe(
      map((results) => ({
        count: results.reduce((sum, result) => sum + result.count, 0),
        results: results.flatMap((result) => result.results),
      }))
    )
  }
}
