import os

from django.core.asgi import get_asgi_application

# Fetch Django ASGI application early to ensure AppRegistry is populated
# before importing consumers and AuthMiddlewareStack that may import ORM
# models.

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "universaldocuments.settings")
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter  # noqa: E402
from channels.routing import URLRouter  # noqa: E402

from universaldocuments.urls import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    },
)

import logging  # noqa: E402

from universaldocuments.version import __full_version_str__  # noqa: E402

logger = logging.getLogger("universaldocuments.asgi")
logger.info(f"[init] Universal Documents version: v{__full_version_str__}")
