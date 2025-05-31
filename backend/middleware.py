# middleware.py

import threading
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication

_thread_locals = threading.local()

class ThreadUserMiddleware:
    """
    1) Try JWT auth via Simple JWT
    2) Fallback to Django session auth
    3) Store the resolved user in thread-local storage
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth    = JWTAuthentication()

    def __call__(self, request):
        # 1) Log the raw header
        print(f"[Middleware] HTTP_AUTHORIZATION: {request.META.get('HTTP_AUTHORIZATION')!r}")

        user = None
        # 2) JWT authentication
        try:
            auth = self.jwt_auth.authenticate(request)
            if auth is not None:
                user, validated_token = auth
                print(f"[Middleware] JWT-authenticated user: {user}")
        except Exception as e:
            print(f"[Middleware] JWT auth error: {e}")

        # 3) Session fallback
        if user is None:
            user = getattr(request, 'user', None) or AnonymousUser()
            print(f"[Middleware] Session-authenticated user: {user}")

        # 4) Stash for signals
        _thread_locals.user = user
        return self.get_response(request)

def get_current_user():
    """Retrieve the user saved by ThreadUserMiddleware."""
    return getattr(_thread_locals, 'user', None)
