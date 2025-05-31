# reports/serializers.py
from rest_framework import serializers

class AccountSummarySerializer(serializers.Serializer):
    group = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)

class BalanceSheetSerializer(serializers.Serializer):
    assets = AccountSummarySerializer(many=True)
    liabilities = AccountSummarySerializer(many=True)
    equity = AccountSummarySerializer(many=True)

class ProfitLossSerializer(serializers.Serializer):
    revenue = AccountSummarySerializer(many=True)
    expenses = AccountSummarySerializer(many=True)
    net_profit = serializers.DecimalField(max_digits=14, decimal_places=2)

class CashFlowSerializer(serializers.Serializer):
    operating = AccountSummarySerializer(many=True)
    investing = AccountSummarySerializer(many=True)
    financing = AccountSummarySerializer(many=True)
    net_change = serializers.DecimalField(max_digits=14, decimal_places=2)
