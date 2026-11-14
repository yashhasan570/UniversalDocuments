import { Injectable } from '@angular/core'
import { CustomField } from 'src/app/data/custom-field'
import { AbstractUniversalService } from './abstract-universaldocuments-service'

@Injectable({
  providedIn: 'root',
})
export class CustomFieldsService extends AbstractUniversalService<CustomField> {
  constructor() {
    super()
    this.resourceName = 'custom_fields'
  }
}
