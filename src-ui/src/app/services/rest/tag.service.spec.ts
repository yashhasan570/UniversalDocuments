import { commonAbstractNameFilterUniversalServiceTests } from './abstract-name-filter-service.spec'
import { TagService } from './tag.service'

commonAbstractNameFilterUniversalServiceTests('tags', TagService)
