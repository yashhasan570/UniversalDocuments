import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, first, map } from 'rxjs'
import { environment } from 'src/environments/environment'
import { UniversalConfig } from '../data/universaldocuments-config'

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  protected http = inject(HttpClient)

  protected baseUrl: string = environment.apiBaseUrl + 'config/'

  getConfig(): Observable<UniversalConfig> {
    return this.http.get<[UniversalConfig]>(this.baseUrl).pipe(
      first(),
      map((configs) => configs[0])
    )
  }

  saveConfig(config: UniversalConfig): Observable<UniversalConfig> {
    // dont pass string
    if (typeof config.app_logo === 'string') delete config.app_logo
    return this.http
      .patch<UniversalConfig>(`${this.baseUrl}${config.id}/`, config)
      .pipe(first())
  }

  uploadFile(
    file: File,
    configID: number,
    configKey: string
  ): Observable<UniversalConfig> {
    let formData = new FormData()
    formData.append(configKey, file, file.name)
    return this.http
      .patch<UniversalConfig>(`${this.baseUrl}${configID}/`, formData)
      .pipe(first())
  }
}
