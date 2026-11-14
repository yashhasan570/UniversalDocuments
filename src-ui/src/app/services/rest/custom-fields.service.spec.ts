import { HttpTestingController } from '@angular/common/http/testing'
import { Subscription } from 'rxjs'
import { commonAbstractUniversalServiceTests } from './abstract-universaldocuments-service.spec'
import { CustomFieldsService } from './custom-fields.service'

let httpTestingController: HttpTestingController
let service: CustomFieldsService
let subscription: Subscription
const endpoint = 'custom_fields'

// run common tests
commonAbstractUniversalServiceTests(endpoint, CustomFieldsService)
