import { commonAbstractNameFilterUniversalServiceTests } from './abstract-name-filter-service.spec'
import { DocumentTypeService } from './document-type.service'

commonAbstractNameFilterUniversalServiceTests(
  'document_types',
  DocumentTypeService
)
