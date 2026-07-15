-- Allow editing/deleting stock ledger rows (app-layer restricts this to the
-- single latest, non-receipt/non-test_usage transaction per item — see
-- lib/actions/inventory.ts updateStockTransaction/deleteStockTransaction).
-- Previously only SELECT/INSERT policies existed on this table.

create policy edoslmis_stock_transactions_update
  on edoslmis_stock_transactions
  for update
  using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  )
  with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

create policy edoslmis_stock_transactions_delete
  on edoslmis_stock_transactions
  for delete
  using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );
