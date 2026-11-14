from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class UniversalMailConfig(AppConfig):
    name = "universaldocuments_mail"

    verbose_name = _("Universal mail")
