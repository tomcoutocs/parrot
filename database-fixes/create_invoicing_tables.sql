-- Invoicing and Billing MVP Database Schema
-- This creates all tables needed for the invoicing MVP features

-- Clients Table (must be created first as invoices references it)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_address TEXT,
  
  -- Invoice Details
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'partially_paid')),
  
  -- Financial
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  paid_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Branding & Customization
  logo_url TEXT,
  notes TEXT,
  terms TEXT,
  footer_text TEXT,
  
  -- Tracking
  hosted_link_token VARCHAR(100) UNIQUE,
  pdf_url TEXT,
  last_viewed_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Offline support
  is_offline_draft BOOLEAN DEFAULT FALSE,
  offline_sync_status VARCHAR(20) DEFAULT 'synced' CHECK (offline_sync_status IN ('synced', 'pending', 'failed'))
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('credit_card', 'bank_transfer', 'check', 'cash', 'paypal', 'stripe', 'ach')),
  payment_reference VARCHAR(255),
  
  -- Stripe Integration
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  stripe_status VARCHAR(50),
  
  -- Hold & Payout Transparency
  is_held BOOLEAN DEFAULT FALSE,
  hold_reason TEXT,
  hold_release_date TIMESTAMPTZ,
  payout_eligible BOOLEAN DEFAULT FALSE,
  payout_eligible_date TIMESTAMPTZ,
  payout_date TIMESTAMPTZ,
  manual_review_required BOOLEAN DEFAULT FALSE,
  review_status VARCHAR(50) DEFAULT 'none' CHECK (review_status IN ('none', 'pending', 'approved', 'rejected')),
  review_notes TEXT,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled')),
  failure_reason TEXT,
  
  -- Metadata
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recurring Invoices Table
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  template_data JSONB NOT NULL, -- Stores invoice template (line items, tax, etc.)
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  next_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  total_generated INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Expense Details
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(100),
  subcategory VARCHAR(100),
  vendor VARCHAR(255),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Auto-categorization
  auto_categorized BOOLEAN DEFAULT FALSE,
  categorization_confidence DECIMAL(5,2), -- 0-100
  suggested_category VARCHAR(100),
  user_confirmed_category BOOLEAN DEFAULT FALSE,
  
  -- Receipt
  receipt_url TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  
  -- Bank Connection (Plaid)
  plaid_transaction_id VARCHAR(255),
  plaid_account_id VARCHAR(255),
  bank_account_name VARCHAR(255),
  is_bank_imported BOOLEAN DEFAULT FALSE,
  
  -- Matching
  matched_to_invoice BOOLEAN DEFAULT FALSE,
  matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash Flow View (Materialized or computed)
-- This will be computed from invoices and expenses

-- AI Bookkeeping Assistant Queries Log
CREATE TABLE IF NOT EXISTS ai_bookkeeping_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Query
  question TEXT NOT NULL,
  query_type VARCHAR(50), -- 'profit_analysis', 'expense_trend', 'categorization', 'explanation'
  
  -- Response
  answer TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  data_sources JSONB, -- References to invoices, expenses, etc.
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ticket Details
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  
  -- SLA Tracking
  sla_hours INTEGER DEFAULT 24, -- Response time SLA in hours
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_staff BOOLEAN DEFAULT FALSE,
  
  message TEXT NOT NULL,
  attachments JSONB, -- Array of file URLs
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Account Recovery Codes
CREATE TABLE IF NOT EXISTS account_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  code_hash VARCHAR(255) NOT NULL, -- Hashed recovery code
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Login Audit History
CREATE TABLE IF NOT EXISTS login_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_method VARCHAR(50), -- 'password', 'recovery_code', 'admin_override'
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_space_id ON invoices(space_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_hosted_link_token ON invoices(hosted_link_token);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_space_id ON payments(space_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_expenses_space_id ON expenses(space_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_plaid_transaction_id ON expenses(plaid_transaction_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_space_id ON recurring_invoices(space_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status ON recurring_invoices(status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_date);
CREATE INDEX IF NOT EXISTS idx_support_tickets_space_id ON support_tickets(space_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_account_recovery_codes_user_id ON account_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_user_id ON login_audit_log(user_id);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
-- Note: RLS policies are created in a separate file: create_invoicing_tables_rls.sql
-- This allows you to run the table creation first, then add policies separately
-- Run create_invoicing_tables_rls.sql after this file completes successfully

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_bookkeeping_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_audit_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (simplified to avoid column reference errors)
-- Full policies are in create_invoicing_tables_rls.sql

-- Temporary permissive policies (replace with proper policies from RLS file)
CREATE POLICY "temp_invoices_select" ON invoices FOR SELECT USING (true);
CREATE POLICY "temp_invoices_insert" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "temp_invoices_update" ON invoices FOR UPDATE USING (true);
CREATE POLICY "temp_invoices_delete" ON invoices FOR DELETE USING (true);

CREATE POLICY "temp_line_items_all" ON invoice_line_items FOR ALL USING (true);
CREATE POLICY "temp_clients_all" ON clients FOR ALL USING (true);
CREATE POLICY "temp_payments_all" ON payments FOR ALL USING (true);
CREATE POLICY "temp_expenses_all" ON expenses FOR ALL USING (true);
CREATE POLICY "temp_recurring_invoices_all" ON recurring_invoices FOR ALL USING (true);
CREATE POLICY "temp_ai_queries_all" ON ai_bookkeeping_queries FOR ALL USING (true);
CREATE POLICY "temp_support_tickets_all" ON support_tickets FOR ALL USING (true);
CREATE POLICY "temp_support_messages_all" ON support_messages FOR ALL USING (true);
CREATE POLICY "temp_recovery_codes_all" ON account_recovery_codes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "temp_login_audit_select" ON login_audit_log FOR SELECT USING (user_id = auth.uid());

-- Note: After running this file, run create_invoicing_tables_rls.sql to replace
-- these temporary policies with proper RLS policies that check space access

COMMENT ON TABLE invoices IS 'Main invoices table with offline draft support and hosted links';
COMMENT ON TABLE payments IS 'Payment tracking with Stripe integration and hold/payout transparency';
COMMENT ON TABLE expenses IS 'Expense tracking with Plaid integration and auto-categorization';
COMMENT ON TABLE ai_bookkeeping_queries IS 'AI assistant query log for bookkeeping questions';
COMMENT ON TABLE support_tickets IS 'Support ticket system with SLA tracking';
COMMENT ON TABLE account_recovery_codes IS 'Backup recovery codes for account access';

