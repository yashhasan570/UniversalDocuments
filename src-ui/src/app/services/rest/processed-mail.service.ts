import { Injectable } from '@angular/core'
import { ProcessedMail } from 'src/app/data/processed-mail'
import { AbstractUniversalService } from './abstract-universaldocuments-service'

@Injectable({
  providedIn: 'root',
})
export class ProcessedMailService extends AbstractUniversalService<ProcessedMail> {
  constructor() {
    super()
    this.resourceName = 'processed_mail'
  }

  public bulk_delete(mailIds: number[]) {
    return this.http.post(`${this.getResourceUrl()}bulk_delete/`, {
      mail_ids: mailIds,
    })
  }
}
