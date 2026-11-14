from django_filters import FilterSet

from universaldocuments_mail.models import ProcessedMail


class ProcessedMailFilterSet(FilterSet):
    class Meta:
        model = ProcessedMail
        fields = {
            "rule": ["exact"],
            "status": ["exact"],
        }
