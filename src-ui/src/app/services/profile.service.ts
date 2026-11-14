import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { environment } from 'src/environments/environment'
import {
  UniversalUserProfile,
  SocialAccountProvider,
  TotpSettings,
} from '../data/user-profile'

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient)

  private endpoint = 'profile'

  get(): Observable<UniversalUserProfile> {
    return this.http.get<UniversalUserProfile>(
      `${environment.apiBaseUrl}${this.endpoint}/`
    )
  }

  update(profile: UniversalUserProfile): Observable<UniversalUserProfile> {
    return this.http.patch<UniversalUserProfile>(
      `${environment.apiBaseUrl}${this.endpoint}/`,
      profile
    )
  }

  generateAuthToken(): Observable<string> {
    return this.http.post<string>(
      `${environment.apiBaseUrl}${this.endpoint}/generate_auth_token/`,
      {}
    )
  }

  disconnectSocialAccount(id: number): Observable<number> {
    return this.http.post<number>(
      `${environment.apiBaseUrl}${this.endpoint}/disconnect_social_account/`,
      { id: id }
    )
  }

  getSocialAccountProviders(): Observable<SocialAccountProvider[]> {
    return this.http.get<SocialAccountProvider[]>(
      `${environment.apiBaseUrl}${this.endpoint}/social_account_providers/`
    )
  }

  getTotpSettings(): Observable<TotpSettings> {
    return this.http.get<TotpSettings>(
      `${environment.apiBaseUrl}${this.endpoint}/totp/`
    )
  }

  activateTotp(
    totpSecret: string,
    totpCode: string
  ): Observable<{ success: boolean; recovery_codes: string[] }> {
    return this.http.post<{ success: boolean; recovery_codes: string[] }>(
      `${environment.apiBaseUrl}${this.endpoint}/totp/`,
      {
        secret: totpSecret,
        code: totpCode,
      }
    )
  }

  deactivateTotp(): Observable<boolean> {
    return this.http.delete<boolean>(
      `${environment.apiBaseUrl}${this.endpoint}/totp/`,
      {}
    )
  }
}
