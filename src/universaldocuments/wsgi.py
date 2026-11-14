"""
WSGI config for universaldocuments project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.10/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "universaldocuments.settings")

application = get_wsgi_application()

import logging  # noqa: E402

from universaldocuments.version import __full_version_str__  # noqa: E402

logger = logging.getLogger("universaldocuments.wsgi")
logger.info(f"[init] Universal Documents version: v{__full_version_str__}")
