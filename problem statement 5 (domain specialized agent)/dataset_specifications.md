## Dataset Specifications for Month-End Close Dataset

### Portfolio Profile
**PE Firm** - 8 Portfolio Companies

| Company | Revenue | Industry | Employees | Key Characteristics |
|---------|---------|----------|-----------|---------------------|
| TechForge SaaS | $45M | SaaS | 180 | High growth, subscription revenue |
| PrecisionMfg Inc | $120M | Manufacturing | 450 | COGS-heavy, inventory management |
| RetailCo | $200M | Retail | 1,200 | 35 locations, high inventory turns |
| HealthServices Plus | $35M | Healthcare | 220 | Professional services, HIPAA compliance |
| LogisticsPro | $80M | Transportation | 350 | Asset-heavy, fuel costs |
| IndustrialSupply Co | $150M | Distribution | 280 | Wholesale, thin margins |
| DataAnalytics Corp | $25M | Professional Services | 95 | Project-based, utilization-driven |
| EcoPackaging Ltd | $60M | Manufacturing | 310 | Sustainable materials, ESG focus |

### Data Files Structure

#### 1. Trial Balances (`trial_balances/`)
**Format**: CSV files, one per company per month
**Columns**:
```
account_code,account_name,debit,credit,balance,account_type
1000,Cash and Cash Equivalents,5234000,0,5234000,Asset
1100,Accounts Receivable,8456000,0,8456000,Asset
1200,Inventory,12340000,0,12340000,Asset
...
```

**Requirements**:
- Standard 4-digit account codes (1000-1999: Assets, 2000-2999: Liabilities, 3000-3999: Equity, 4000-4999: Revenue, 5000-9999: Expenses)
- Debits must equal credits for each company
- 3 months of data (current month + 2 prior)
- Intentional issues:
  - Some miscategorized expenses (marketing spend in COGS)
  - Missing accruals (December bonuses not accrued)
  - Timing differences (prepaid insurance not amortized correctly)

#### 2. Budgets (`budgets/`)
**Format**: CSV
**Columns**:
```
company_id,month,account_code,account_name,budget_amount
techforge_saas,2026-01,4000,Subscription Revenue,3750000
techforge_saas,2026-01,5100,Salaries and Wages,1250000
...
```

#### 3. Prior Year Data (`prior_year/`)
Same structure as trial balances, for YoY comparison

#### 4. Intercompany Transactions (`intercompany/`)
**Format**: CSV
**Columns**:
```
transaction_id,date,selling_entity,buying_entity,description,amount,gl_account
IC-001,2026-01-15,industrialsupply_co,precisionmfg_inc,Raw materials,125000,1100/2000
IC-002,2026-01-20,techforge_saas,dataanalytics_corp,Software licenses,45000,1100/2000
...
```

**Requirements**:
- 30-50 intercompany transactions per month
- Must net to zero at consolidation
- Some intentionally missing elimination entries

#### 5. Revenue Contracts (`contracts/`)
**Format**: JSON
```json
{
  "contract_id": "CNTR-2024-001",
  "customer": "Acme Corporation",
  "company": "techforge_saas",
  "start_date": "2024-06-01",
  "end_date": "2027-05-31",
  "total_contract_value": 540000,
  "billing_schedule": "annual",
  "performance_obligations": [
    {
      "description": "Software subscription",
      "revenue_recognition": "ratable",
      "value": 480000
    },
    {
      "description": "Implementation services",
      "revenue_recognition": "milestone",
      "value": 60000,
      "completion_percentage": 80
    }
  ]
}
```

#### 6. Bank Statements (`bank_statements/`)
**Format**: CSV
```
date,description,debit,credit,balance
2026-01-01,Beginning Balance,,,5234000
2026-01-02,Customer Payment - Invoice 4523,,125000,5359000
2026-01-03,Payroll,450000,,4909000
...
```

#### 7. Accrual Schedules (`accrual_schedules/`)
**Format**: CSV
```
company,accrual_type,gl_account,frequency,amount,last_booked_date
techforge_saas,Rent Expense,6200,monthly,45000,2025-12-31
precisionmfg_inc,Utilities,6400,monthly,22000,2025-12-31
...
```

### Data Generation Script Outline
```python
# generate_month_end_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

def generate_trial_balance(company_config, month):
    """Generate realistic trial balance with intentional issues"""
    accounts = get_chart_of_accounts(company_config['industry'])
    
    # Generate realistic balances based on revenue scale
    # Add intentional errors for testing:
    # - 5% chance of miscategorized expense
    # - 2% chance of missing accrual
    # - Ensure debits = credits
    pass

def generate_intercompany_transactions(companies, month, volume=40):
    """Generate intercompany transactions requiring elimination"""
    # Create logical pairings (supplier-buyer relationships)
    # Ensure amounts are material enough to matter
    pass

# Generate all data files
for month in ['2025-11', '2025-12', '2026-01']:
    for company in companies:
        generate_trial_balance(company, month)
        generate_budgets(company, month)
        ...
```

---


## Data Generation Tools & Scripts

### Recommended Approach
1. **Python Faker Library**: Generate company names, addresses, contact info
2. **NumPy/Pandas**: Generate time-series financial data with realistic distributions
3. **Industry-specific logic**: Apply appropriate metrics per sector
4. **Seed data for reproducibility**: Same seed = same dataset

### Sample Generation Script Skeleton
```python
import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import random

fake = Faker()
np.random.seed(42)  # Reproducibility

class FinancialDataGenerator:
    def __init__(self, company_config):
        self.company = company_config
        self.industry = company_config['industry']
        
    def generate_pl(self, start_date, periods=36):
        """Generate P&L with realistic growth and seasonality"""
        dates = pd.date_range(start_date, periods=periods, freq='MS')
        
        # Base revenue with growth trend and seasonality
        base_revenue = self.company['annual_revenue'] / 12
        growth_rate = self.company['growth_rate']
        seasonality = self.get_seasonality_factors(self.industry)
        
        pl_data = []
        for i, date in enumerate(dates):
            month_revenue = base_revenue * (1 + growth_rate) ** (i/12) * seasonality[date.month - 1]
            
            # Generate other P&L lines based on industry norms
            cogs = month_revenue * self.get_cogs_pct(self.industry)
            gross_profit = month_revenue - cogs
            
            # Operating expenses with some randomness
            sg_a = gross_profit * np.random.uniform(0.35, 0.45)
            rd = gross_profit * np.random.uniform(0.10, 0.20) if self.industry in ['SaaS', 'Technology'] else 0
            
            ebitda = gross_profit - sg_a - rd
            
            pl_data.append({
                'date': date,
                'revenue': month_revenue,
                'cogs': cogs,
                'gross_profit': gross_profit,
                'sg_a': sg_a,
                'rd': rd,
                'ebitda': ebitda
            })
        
        return pd.DataFrame(pl_data)
    
    def get_seasonality_factors(self, industry):
        """Industry-specific seasonality patterns"""
        if industry == 'Retail':
            # Strong Q4 (holidays)
            return [0.85, 0.80, 0.90, 0.95, 1.00, 1.00, 0.95, 0.95, 1.00, 1.05, 1.20, 1.35]
        elif industry == 'SaaS':
            # Relatively flat, slight Q4 boost
            return [0.98, 0.97, 1.00, 1.00, 1.01, 1.00, 0.99, 1.00, 1.01, 1.02, 1.02, 1.05]
        # ... more industries
    
    def generate_working_capital(self, pl_data):
        """Generate AR, inventory, AP based on P&L"""
        # DSO logic
        dso = self.company.get('dso', 45)  # Default 45 days
        ar = (pl_data['revenue'] / 30) * dso
        
        # DIO logic (for companies with inventory)
        if self.company.get('has_inventory', False):
            dio = self.company.get('dio', 60)
            inventory = (pl_data['cogs'] / 30) * dio
        else:
            inventory = 0
        
        # DPO logic
        dpo = self.company.get('dpo', 30)
        ap = (pl_data['cogs'] / 30) * dpo
        
        return pd.DataFrame({
            'ar': ar,
            'inventory': inventory,
            'ap': ap,
            'net_working_capital': ar + inventory - ap
        })

# Usage
companies = [
    {
        'name': 'TechForge SaaS',
        'annual_revenue': 45_000_000,
        'growth_rate': 0.35,
        'industry': 'SaaS',
        'has_inventory': False,
        'dso': 35,
        'dpo': 45
    },
    # ... more companies
]

for company_config in companies:
    generator = FinancialDataGenerator(company_config)
    pl = generator.generate_pl('2023-01-01')
    wc = generator.generate_working_capital(pl)
    # Save to CSV
```

---

## Data Quality Checklist

Before delivering datasets, verify:

### Financial Accuracy
- [ ] Trial balances: Debits = Credits
- [ ] Balance sheets: Assets = Liabilities + Equity
- [ ] Cash flow: Beginning + Cash Flow = Ending cash
- [ ] P&L: Revenue - Expenses = Net Income

### Temporal Consistency
- [ ] No negative time periods
- [ ] Dates in logical sequence
- [ ] Historical data precedes current period

### Realistic Distributions
- [ ] Financial metrics fall within industry norms (±2 std dev)
- [ ] KPIs have reasonable ranges
- [ ] Growth rates are plausible

### Intentional Complexity
- [ ] Issues for agents to find (miscategorizations, missing accruals, variances)
- [ ] Edge cases (negative margins, covenant breaches, cash shortfalls)
- [ ] Sufficient variety to test agent intelligence

### Completeness
- [ ] All required files present
- [ ] No missing critical data
- [ ] Proper README documentation

---

## Data Delivery Format

### Compression
All datasets delivered as `.zip` files:
- `assignment_month_end_data.zip`

### README Per Dataset
Each zip includes `README.md` with:
1. Dataset overview
2. File structure explanation
3. Data dictionary (column definitions)
4. Known issues / edge cases
5. Loading instructions
6. Sample queries to validate data loaded correctly

### Total Dataset Sizes
- Assignment : ~50MB (8 companies, 3 months detailed)
---

## Candidate Support

### Sample Data Validation Scripts
Provide scripts to help candidates verify data loaded correctly:

```python
# validate_data.py
import pandas as pd

def validate_trial_balance(df):
    """Ensure debits = credits"""
    total_debits = df['debit'].sum()
    total_credits = df['credit'].sum()
    assert abs(total_debits - total_credits) < 0.01, "Trial balance doesn't balance!"
    print(f"✓ Trial balance validated: Debits ({total_debits}) = Credits ({total_credits})")

def validate_pl(df):
    """Ensure P&L math is correct"""
    gross_profit = df['revenue'] - df['cogs']
    assert (gross_profit == df['gross_profit']).all(), "Gross profit calculation error"
    print("✓ P&L calculations validated")

# Run validations
tb = pd.read_csv('trial_balances/techforge_saas_2026-01.csv')
validate_trial_balance(tb)
```