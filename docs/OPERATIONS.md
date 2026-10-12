# BizCore operations guide

## A 10-minute portfolio demo

Register a fictional company at [the live preview](https://bizcore-web.onrender.com/#/register). Keep the administrator session open. Create an Employee and Vendor user in **User Management**, each with its own email and password. Use separate browser profiles/private windows for those logins.

1. **Projects → Projects:** create “Office launch”. Open **View tasks**, create “Inspect desks”, assign the employee, and set priority and due date. The employee opens **My Tasks**, starts the task, logs 45 minutes, and marks it done. The administrator can then complete the project. Time logs survive a refresh.
2. **Vendors → Suppliers:** create “Acme Furnishings” and link the Vendor account. Under **Contracts**, draft an agreement with dates and terms, then activate it. The vendor can read the active contract in its portal.
3. **Inventory → Products:** add SKU `DESK-01`, “Office desk”, unit cost ₹100 and reorder level 2. New products start at zero stock, so the alert appears immediately. Opening stock can be added with **Adjust stock** and a reason.
4. **Inventory → Purchase Orders:** draft an order for 3 desks at ₹100 each and place it. The vendor sees only its placed order and can acknowledge it. The administrator receives the order after delivery. Stock becomes 3, the alert clears, and Finance gets one unpaid ₹300 expense. A second receipt is rejected.
5. **Finance → Invoices:** draft a ₹1,000 service invoice with 10% tax and issue it. Record an actual external payment of ₹500 with a reference. The invoice becomes Part Paid with ₹600 outstanding. BizCore records payments; it does not charge cards or transfer funds.
6. **Finance → Expenses:** mark the ₹300 purchase expense paid using its payment date. Create and pay a manual ₹50 delivery expense. Under **Cash-flow Report**, the selected period shows ₹500 received, ₹350 spent, and ₹150 net cash flow. Export the CSV.

The numbers above assume a new company without other records. Use fictional data in the public portfolio preview.

## Roles

| Workflow | CompanyAdmin / SuperAdmin in current company | Manager | Employee | Vendor |
| --- | --- | --- | --- | --- |
| Projects and tasks | Create, edit, assign, change status | Same | See assigned work and update own tasks | No access |
| Time logs | View company logs, log own time, remove entries | Same | Log/view/remove own entries | No access |
| Products, adjustments, stock history | Manage | Manage | No access | No access |
| Suppliers, contracts, purchase orders | Manage | Manage | No access | Read linked supplier profile and shared records; acknowledge placed orders |
| Invoices, payments, expenses, reports | Manage | No access | No access | No access |

The API checks active account/company and current database role on every operations request. Hiding navigation is only a convenience; it is not the security boundary. Vendor accounts must be linked to one active supplier. Changing that link changes access immediately.

## Workflow rules

- Projects are Active, Completed, or Archived. Complete all tasks before completing a project. Reopen it before changing tasks or adding time.
- Tasks are Todo, InProgress, or Done, with Low/Medium/High priority. Assignees must be active staff in the same company. Tasks cannot move between projects after creation.
- Time uses whole minutes and UTC dates no later than today. Each person's daily total cannot exceed 1,440 minutes. Manager entries are still recorded as that manager's time.
- Supplier contracts begin as drafts; activation shares them with the linked vendor. Active contracts past their end date display as Expired. Ending a contract retains its history.
- Products use whole stock units, between 0 and 1,000,000. SKU is unique within a company. Stock changes require a reason; negative balances are rejected. Archived products remain in history.
- Orders progress Draft → Placed → optional Acknowledged → Received. Draft, placed, or acknowledged orders may be cancelled. Only drafts can be edited. A receipt processes the full order; partial deliveries and returns are not implemented. Zero-cost orders add stock without an expense.
- Invoices progress Draft → Issued → PartPaid → Paid. Drafts are editable; unpaid drafts/issued invoices may be voided. Recorded payments cannot exceed the balance or predate the issue date. Payments are ledger records, not a payment gateway. Refunds and credit notes are not implemented.
- Manual expenses can be edited while Recorded. Received-order expenses keep their purchase values. Recorded expenses may become Paid or Voided. Voiding an expense does not reverse inventory stock.
- All financial values are INR with up to two decimal places. Invoice line totals round to two decimals before tax is added; the final total rounds away from zero at midpoints. Quantities on invoices may have two decimals. Amounts are limited to ₹1 billion.
- Reports use up to 366 days. Period totals use invoice issue dates, payment dates, and expense paid dates respectively. “Outstanding now” and “Unpaid expenses” deliberately include all dates. Net cash flow is receipts minus paid expenses, not accounting profit. CSV exports cap at 10,000 entries and escape spreadsheet formula prefixes.

## Implementation and data model

The additive `OperationsModules` migration creates 13 tables in schema `ops`:

| Group | Tables | Relationship |
| --- | --- | --- |
| Projects | WorkProject, ProjectTask, TimeEntry | Project → tasks → personal time entries |
| Suppliers | Supplier, SupplierContract | Supplier → contracts; optional portal user link |
| Inventory | Product, PurchaseOrder, PurchaseLine, StockMovement | Order → product lines; receipt → stock ledger |
| Finance | Invoice, InvoiceLine, InvoicePayment, Expense | Invoice → lines/payments; received order → expense |

Every row has a CompanyId. Composite company/record foreign keys prevent linked operations records from crossing companies. Unique indexes protect SKUs, document numbers, portal links, received-order expenses, and payment/adjustment request IDs. Check constraints reject invalid stock, quantities and amounts. Staff IDs are checked in the application; historical time/stock records remain after account deletion.

`OperationsService` is split by workflow into ProjectsService, InventoryService, and FinanceService. Each write acquires a PostgreSQL transaction-scoped advisory lock keyed by company, then checks current state, changes records, adds an audit entry, and commits. This serializes same-company operations writes and makes purchase stock/expense changes atomic. It is a deliberate low-volume portfolio design; a busy production ERP would need finer-grained locks and load testing.

Stock adjustments and payments accept a client-generated RequestId. Repeating the same request returns the original record; reusing the ID with another payload returns 409. The UI preserves the ID across retries in the open dialog. Purchase receipts are guarded by the order's current state. Server-side checks remain authoritative when multiple browser sessions act at once.

The React operations screens share accessible native dialogs, field validation, searchable relationship selectors, pagination, error/retry states, status badges and responsive record cards. Lists fetch 20 records per page. Relationship selectors return at most 100 search matches; type a name to narrow a large list.

## API map

All routes require JWT authentication and begin `/api/operations`.

| Route | Methods / purpose |
| --- | --- |
| `/projects`, `/tasks`, `/suppliers`, `/contracts`, `/products`, `/orders`, `/invoices`, `/expenses` | GET paginated list, POST create, PUT `/{id}` edit where state permits |
| `/projects/{id}/status`, `/tasks/{id}/status`, `/contracts/{id}/status`, `/orders/{id}/status`, `/invoices/{id}/status`, `/expenses/{id}/status` | PUT permitted lifecycle transition |
| `/time-entries` | GET list, POST personal entry, DELETE `/{id}` |
| `/products/{id}/stock` | POST quantity delta, reason and RequestId |
| `/movements` | GET stock ledger; optional parentId product filter |
| `/invoices/{id}/payments` | POST amount, date, reference and RequestId |
| `/reports`, `/reports/export` | GET date-range report / CSV with `from` and `to` |
| `/people` | GET searchable active company accounts for assignment/linking |

Common list parameters are `search`, `page`, and `pageSize`; lifecycle lists also use `status`. Task lists accept project `parentId` and `mine`; product lists accept `lowStock`; order/contract lists accept supplier `parentId`. Errors distinguish invalid input (400), insufficient access (403), missing/foreign records (404), and conflicting state (409).

## Verification and limits

Unit tests cover the PostgreSQL model snapshot, role/tenant boundaries, receipt effects, payment idempotency/overpayment, negative-stock rejection, daily time limits, and project completion rules. Playwright exercises the actual forms and PostgreSQL-backed APIs with separate administrator, employee, vendor, and outsider accounts, plus concurrent receipts and payments. CI starts the API twice against the same schema and retains desktop/mobile screenshots.

This portfolio implementation does not include payroll, accounting journals, statutory tax invoices, payment processing, email delivery, document signing, multiple currencies/warehouses, or purchase returns. These are extensions, not hidden working features. The existing HR and administration limitations remain documented in [COMPLETION.md](COMPLETION.md).
