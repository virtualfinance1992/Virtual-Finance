from django.apps import AppConfig

class VoucherAuditConfig(AppConfig):
    name = 'voucher_audit'

    def ready(self):
        # import the signal handlers so they’re registered
        import voucher_audit.signals  # noqa
