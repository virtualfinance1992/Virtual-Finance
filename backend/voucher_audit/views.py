# voucher_audit/views.py
import logging
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import VoucherView
from .serializers import VoucherViewSerializer

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def voucher_view_history(request, company_id, voucher_id):
    logger.info(f"[View] Request for snapshot history: company={company_id}, voucher_param={voucher_id}")

    # Step 1: fetch any snapshots where voucher == voucher_id OR snapshot.against_voucher == voucher_id
    base_qs = VoucherView.objects.filter(company_id=company_id)
    snaps = base_qs.filter(
        Q(voucher_id=voucher_id) |
        Q(snapshot__against_voucher=voucher_id)
    ).order_by('snapshot__date', 'id')
    logger.info(f"[View] Initially found {snaps.count()} snapshot(s) for voucher_param={voucher_id}")
    logger.debug(f"[View] Initial voucher IDs: {list(snaps.values_list('voucher', flat=True))}")

    # Step 2: if none of those is a SALE snapshot (i.e. user passed a RECEIPT ID),
    #          pull in the sale snapshots explicitly
    has_sale = any(h.snapshot.get('voucher_type') == 'SALES' for h in snaps)
    if not has_sale:
        # assume voucher_id is a receipt → find the linked sale ID
        receipt_snap = snaps.filter(snapshot__voucher_type='RECEIPT').first()
        if receipt_snap and receipt_snap.snapshot.get('against_voucher'):
            sale_id = receipt_snap.snapshot['against_voucher']
            logger.info(f"[View] Fallback: treating param {voucher_id} as receipt, linked sale_id={sale_id}")
            sale_snaps = base_qs.filter(voucher_id=sale_id).order_by('snapshot__date', 'id')
            logger.info(f"[View] Fallback: found {sale_snaps.count()} sale snapshot(s) for voucher={sale_id}")
            snaps = list(sale_snaps) + list(snaps)
        else:
            logger.warning(f"[View] No linked sale found for receipt voucher={voucher_id}")

    # Step 3: de-duplicate and sort final list by date→id
    # (convert to list to allow simple python dedupe while preserving order)
    seen = set()
    unique_snaps = []
    for v in snaps:
        if v.id not in seen:
            seen.add(v.id)
            unique_snaps.append(v)
    unique_snaps.sort(key=lambda v: (v.snapshot.get('date'), v.id))
    logger.info(f"[View] Total snapshots returned: {len(unique_snaps)}")
    logger.debug(f"[View] Final voucher IDs: {[v.voucher_id for v in unique_snaps]}")

    for s in unique_snaps:
        print(f"[Snapshot] Voucher: {s.voucher_id}, Type: {s.snapshot.get('voucher_type')}, Against: {s.snapshot.get('against_voucher')}") #new line


    # Step 4: serialize & return
    serializer = VoucherViewSerializer(unique_snaps, many=True)
    logger.debug(f"[View] Serialized data count: {len(serializer.data)}")
    if serializer.data:
        logger.debug(f"[View] First snapshot entry: {serializer.data[0]}")
    return Response(serializer.data)
