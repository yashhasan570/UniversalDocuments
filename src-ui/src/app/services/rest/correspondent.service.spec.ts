import { commonAbstractNameFilterUniversalServiceTests } from './abstract-name-filter-service.spec'
import { CorrespondentService } from './correspondent.service'

commonAbstractNameFilterUniversalServiceTests(
  'correspondents',
  CorrespondentService
)
