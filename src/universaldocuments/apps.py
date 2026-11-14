from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

from universaldocuments.signals import handle_failed_login
from universaldocuments.signals import handle_social_account_updated


class UniversalConfig(AppConfig):
    name = "universaldocuments"

    verbose_name = _("Universal")

    def ready(self) -> None:
        from django.contrib.auth.signals import user_login_failed

        user_login_failed.connect(handle_failed_login)

        from allauth.socialaccount.signals import social_account_updated

        social_account_updated.connect(handle_social_account_updated)

        AppConfig.ready(self)
