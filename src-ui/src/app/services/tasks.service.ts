import { HttpClient } from '@angular/common/http'
import { Injectable, inject, signal } from '@angular/core'
import { EMPTY, Observable, Subject } from 'rxjs'
import {
  catchError,
  finalize,
  first,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators'
import {
  UniversalTask,
  UniversalTaskStatusCounts,
  UniversalTaskType,
} from 'src/app/data/universaldocuments-task'
import { Results } from 'src/app/data/results'
import { environment } from 'src/environments/environment'

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private http = inject(HttpClient)

  private baseUrl: string = environment.apiBaseUrl
  private endpoint: string = 'tasks'

  public loading: boolean = false

  private readonly tasksStatusCounts = signal<UniversalTaskStatusCounts>({
    all: 0,
    needs_attention: 0,
    in_progress: 0,
    completed: 0,
  })
  private readonly reloadNotifier = new Subject<void>()

  private unsubscribeNotifer: Subject<any> = new Subject()

  constructor() {
    this.reloadNotifier
      .pipe(switchMap(() => this.fetchUnacknowledgedTasksCounts()))
      .subscribe((taskStatusCounts) => {
        this.tasksStatusCounts.set(taskStatusCounts)
      })
  }

  private fetchUnacknowledgedTasksCounts(): Observable<UniversalTaskStatusCounts> {
    this.loading = true
    return this.statusCounts({ acknowledged: false }).pipe(
      takeUntil(this.unsubscribeNotifer),
      catchError(() => EMPTY),
      finalize(() => {
        this.loading = false
      })
    )
  }

  public get needsAttentionTasksCount(): number {
    return this.tasksStatusCounts().needs_attention
  }

  public reload() {
    this.reloadNotifier.next()
  }

  public list(
    page: number,
    pageSize: number,
    extraParams?: Record<string, string | number | boolean | readonly string[]>
  ): Observable<Results<UniversalTask>> {
    return this.http.get<Results<UniversalTask>>(
      `${this.baseUrl}${this.endpoint}/`,
      {
        params: {
          page,
          page_size: pageSize,
          ...extraParams,
        },
      }
    )
  }

  public statusCounts(
    extraParams?: Record<string, string | number | boolean | readonly string[]>
  ): Observable<UniversalTaskStatusCounts> {
    return this.http.get<UniversalTaskStatusCounts>(
      `${this.baseUrl}${this.endpoint}/status_counts/`,
      {
        params: extraParams,
      }
    )
  }

  public dismissTasks(task_ids: Set<number>): Observable<any> {
    return this.http
      .post(`${this.baseUrl}${this.endpoint}/acknowledge/`, {
        tasks: [...task_ids],
      })
      .pipe(
        first(),
        takeUntil(this.unsubscribeNotifer),
        tap(() => {
          this.reload()
        })
      )
  }

  public dismissAllTasks(): Observable<any> {
    return this.http
      .post(`${this.baseUrl}${this.endpoint}/acknowledge/`, {
        all: true,
      })
      .pipe(
        first(),
        takeUntil(this.unsubscribeNotifer),
        tap(() => {
          this.reload()
        })
      )
  }

  public cancelPending(): void {
    this.unsubscribeNotifer.next(true)
  }

  public run(taskType: UniversalTaskType): Observable<{ task_id: string }> {
    return this.http.post<{ task_id: string }>(
      `${environment.apiBaseUrl}${this.endpoint}/run/`,
      { task_type: taskType }
    )
  }
}
