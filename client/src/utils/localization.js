const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.members': 'Members',
    'nav.savings': 'Savings',
    'nav.loans': 'Loans',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.backup': 'Backup & Export',
    'nav.users': 'User Management',

    // Dashboard
    'dashboard.totalBalance': 'Total Fund Balance',
    'dashboard.totalMembers': 'Total Members',
    'dashboard.activeLoans': 'Active Loans',
    'dashboard.monthlySavings': 'Monthly Savings',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.monthlySavingsChart': 'Monthly Savings Trend',
    'dashboard.loanDistribution': 'Loan Distribution',

    // Members
    'members.title': 'Members',
    'members.addMember': 'Add Member',
    'members.name': 'Full Name',
    'members.email': 'Email',
    'members.phone': 'Phone',
    'members.address': 'Address',
    'members.joinDate': 'Join Date',
    'members.status': 'Status',
    'members.active': 'Active',
    'members.inactive': 'Inactive',
    'members.totalSavings': 'Total Savings',
    'members.emergencyContact': 'Emergency Contact',
    'members.actions': 'Actions',
    'members.view': 'View',
    'members.edit': 'Edit',
    'members.deactivate': 'Deactivate',
    'members.memberDetail': 'Member Detail',
    'members.financialSummary': 'Financial Summary',
    'members.savingsHistory': 'Savings History',
    'members.statement': 'Statement',

    // Savings
    'savings.title': 'Savings',
    'savings.newTransaction': 'New Transaction',
    'savings.deposit': 'Deposit',
    'savings.withdrawal': 'Withdrawal',
    'savings.amount': 'Amount',
    'savings.date': 'Date',
    'savings.notes': 'Notes',
    'savings.type': 'Type',
    'savings.member': 'Member',
    'savings.totalDeposits': 'Total Deposits',
    'savings.totalWithdrawals': 'Total Withdrawals',
    'savings.netSavings': 'Net Savings',
    'savings.balance': 'Balance',

    // Loans
    'loans.title': 'Loans',
    'loans.newLoan': 'New Loan',
    'loans.loanAmount': 'Loan Amount',
    'loans.interestRate': 'Interest Rate',
    'loans.term': 'Term (Months)',
    'loans.monthlyPayment': 'Monthly Payment',
    'loans.purpose': 'Purpose',
    'loans.startDate': 'Start Date',
    'loans.endDate': 'End Date',
    'loans.status': 'Status',
    'loans.pending': 'Pending',
    'loans.active': 'Active',
    'loans.completed': 'Completed',
    'loans.defaulted': 'Defaulted',
    'loans.approve': 'Approve',
    'loans.totalDisbursed': 'Total Disbursed',
    'loans.outstanding': 'Outstanding',
    'loans.interestEarned': 'Interest Earned',
    'loans.overdue': 'Overdue',
    'loans.repayment': 'Repayment',
    'loans.addRepayment': 'Add Repayment',
    'loans.amortization': 'Amortization Schedule',
    'loans.documents': 'Documents',
    'loans.uploadDocument': 'Upload Document',
    'loans.penalty': 'Penalty',
    'loans.totalInterest': 'Total Interest',
    'loans.totalRepayable': 'Total Repayable',
    'loans.emiCalculator': 'EMI Calculator',
    'loans.principal': 'Principal',

    // Reports
    'reports.title': 'Reports',
    'reports.generate': 'Generate Report',
    'reports.period': 'Period',
    'reports.daily': 'Daily',
    'reports.weekly': 'Weekly',
    'reports.fortnightly': 'Fortnightly',
    'reports.monthly': 'Monthly',
    'reports.trimester': 'Trimester',
    'reports.semiAnnual': '6 Months',
    'reports.yearly': 'Yearly',
    'reports.summary': 'Summary',
    'reports.memberSavings': 'Member Savings',
    'reports.loanPortfolio': 'Loan Portfolio',
    'reports.incomeStatement': 'Income Statement',
    'reports.balanceSheet': 'Balance Sheet',
    'reports.overdueLoans': 'Overdue Loans',
    'reports.print': 'Print',

    // Settings
    'settings.title': 'Settings',
    'settings.orgName': 'Organization Name',
    'settings.currency': 'Currency',
    'settings.interestRate': 'Default Interest Rate',
    'settings.penaltyRate': 'Default Penalty Rate',
    'settings.minSavings': 'Minimum Savings',
    'settings.meetingFrequency': 'Meeting Frequency',
    'settings.fiscalYear': 'Fiscal Year',
    'settings.fiscalYearStart': 'Fiscal Year Start',
    'settings.save': 'Save Settings',
    'settings.calendar': 'Calendar System',
    'settings.calendarAD': 'AD (Gregorian)',
    'settings.calendarBS': 'BS (Bikram Sambat)',
    'settings.language': 'Language',
    'settings.balanceAdjustments': 'Balance Adjustments',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.confirm': 'Confirm',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.actions': 'Actions',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.total': 'Total',
    'common.print': 'Print',
    'common.export': 'Export',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.credit': 'Credit',
    'common.debit': 'Debit',
    'common.reason': 'Reason',

    // Auth
    'auth.login': 'Sign In',
    'auth.logout': 'Logout',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.welcome': 'Welcome back',
    'auth.signInToContinue': 'Sign in to your account',
  },
  ne: {
    // Navigation
    'nav.dashboard': '\u0921\u094D\u092F\u093E\u0938\u092C\u094B\u0930\u094D\u0921',
    'nav.members': '\u0938\u0926\u0938\u094D\u092F\u0939\u0930\u0942',
    'nav.savings': '\u092C\u091A\u0924',
    'nav.loans': '\u0990\u0923',
    'nav.reports': '\u092A\u094D\u0930\u0924\u093F\u0935\u0947\u0926\u0928',
    'nav.settings': '\u0938\u0947\u091F\u093F\u0919\u094D\u0938',
    'nav.backup': '\u092C\u094D\u092F\u093E\u0915\u0905\u092A \u0930 \u0928\u093F\u0930\u094D\u092F\u093E\u0924',
    'nav.users': '\u092A\u094D\u0930\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0928',

    // Dashboard
    'dashboard.totalBalance': '\u0915\u0941\u0932 \u0915\u094B\u0937 \u0936\u0947\u0937',
    'dashboard.totalMembers': '\u0915\u0941\u0932 \u0938\u0926\u0938\u094D\u092F',
    'dashboard.activeLoans': '\u0938\u0915\u094D\u0930\u093F\u092F \u0990\u0923',
    'dashboard.monthlySavings': '\u092E\u093E\u0938\u093F\u0915 \u092C\u091A\u0924',
    'dashboard.recentActivity': '\u0939\u093E\u0932\u0915\u094B \u0917\u0924\u093F\u0935\u093F\u0927\u093F',
    'dashboard.quickActions': '\u0926\u094D\u0930\u0941\u0924 \u0915\u093E\u0930\u094D\u092F\u0939\u0930\u0942',
    'dashboard.monthlySavingsChart': '\u092E\u093E\u0938\u093F\u0915 \u092C\u091A\u0924 \u092A\u094D\u0930\u0935\u0943\u0924\u094D\u0924\u093F',
    'dashboard.loanDistribution': '\u0990\u0923 \u0935\u093F\u0924\u0930\u0923',

    // Members
    'members.title': '\u0938\u0926\u0938\u094D\u092F\u0939\u0930\u0942',
    'members.addMember': '\u0938\u0926\u0938\u094D\u092F \u0925\u092A\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'members.name': '\u092A\u0942\u0930\u093E \u0928\u093E\u092E',
    'members.email': '\u0907\u092E\u0947\u0932',
    'members.phone': '\u092B\u094B\u0928',
    'members.address': '\u0920\u0947\u0917\u093E\u0928\u093E',
    'members.joinDate': '\u0938\u0926\u0938\u094D\u092F\u0924\u093E \u092E\u093F\u0924\u093F',
    'members.status': '\u0938\u094D\u0925\u093F\u0924\u093F',
    'members.active': '\u0938\u0915\u094D\u0930\u093F\u092F',
    'members.inactive': '\u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F',
    'members.totalSavings': '\u0915\u0941\u0932 \u092C\u091A\u0924',
    'members.emergencyContact': '\u0906\u092A\u0924\u0915\u093E\u0932\u0940\u0928 \u0938\u092E\u094D\u092A\u0930\u094D\u0915',
    'members.actions': '\u0915\u093E\u0930\u094D\u092F\u0939\u0930\u0942',
    'members.view': '\u0939\u0947\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'members.edit': '\u0938\u092E\u094D\u092A\u093E\u0926\u0928',
    'members.deactivate': '\u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'members.memberDetail': '\u0938\u0926\u0938\u094D\u092F \u0935\u093F\u0935\u0930\u0923',
    'members.financialSummary': '\u0906\u0930\u094D\u0925\u093F\u0915 \u0938\u093E\u0930\u093E\u0902\u0936',
    'members.savingsHistory': '\u092C\u091A\u0924 \u0907\u0924\u093F\u0939\u093E\u0938',
    'members.statement': '\u0935\u093F\u0935\u0930\u0923\u092A\u0924\u094D\u0930',

    // Savings
    'savings.title': '\u092C\u091A\u0924',
    'savings.newTransaction': '\u0928\u092F\u093E\u0901 \u0915\u093E\u0930\u094B\u092C\u093E\u0930',
    'savings.deposit': '\u091C\u092E\u094D\u092E\u093E',
    'savings.withdrawal': '\u091D\u093F\u0915\u094D\u0928\u0947',
    'savings.amount': '\u0930\u0915\u092E',
    'savings.date': '\u092E\u093F\u0924\u093F',
    'savings.notes': '\u091F\u093F\u092A\u094D\u092A\u0923\u0940',
    'savings.type': '\u092A\u094D\u0930\u0915\u093E\u0930',
    'savings.member': '\u0938\u0926\u0938\u094D\u092F',
    'savings.totalDeposits': '\u0915\u0941\u0932 \u091C\u092E\u094D\u092E\u093E',
    'savings.totalWithdrawals': '\u0915\u0941\u0932 \u091D\u093F\u0915\u0947\u0915\u094B',
    'savings.netSavings': '\u0916\u0941\u0926 \u092C\u091A\u0924',
    'savings.balance': '\u0936\u0947\u0937',

    // Loans
    'loans.title': '\u0990\u0923',
    'loans.newLoan': '\u0928\u092F\u093E\u0901 \u0990\u0923',
    'loans.loanAmount': '\u0990\u0923 \u0930\u0915\u092E',
    'loans.interestRate': '\u092C\u094D\u092F\u093E\u091C \u0926\u0930',
    'loans.term': '\u0905\u0935\u0927\u093F (\u092E\u0939\u093F\u0928\u093E)',
    'loans.monthlyPayment': '\u092E\u093E\u0938\u093F\u0915 \u092D\u0941\u0915\u094D\u0924\u093E\u0928\u0940',
    'loans.purpose': '\u0909\u0926\u094D\u0926\u0947\u0936\u094D\u092F',
    'loans.startDate': '\u0938\u0941\u0930\u0941 \u092E\u093F\u0924\u093F',
    'loans.endDate': '\u0905\u0928\u094D\u0924\u093F\u092E \u092E\u093F\u0924\u093F',
    'loans.status': '\u0938\u094D\u0925\u093F\u0924\u093F',
    'loans.pending': '\u0935\u093F\u091A\u093E\u0930\u093E\u0927\u0940\u0928',
    'loans.active': '\u0938\u0915\u094D\u0930\u093F\u092F',
    'loans.completed': '\u092A\u0942\u0930\u093E \u092D\u090F\u0915\u094B',
    'loans.defaulted': '\u091A\u0941\u0915\u094D\u0924\u093E \u0928\u092D\u090F\u0915\u094B',
    'loans.approve': '\u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'loans.totalDisbursed': '\u0915\u0941\u0932 \u0935\u093F\u0924\u0930\u093F\u0924',
    'loans.outstanding': '\u092C\u093E\u0901\u0915\u0940 \u0930\u0915\u092E',
    'loans.interestEarned': '\u092C\u094D\u092F\u093E\u091C \u0906\u092E\u094D\u0926\u093E\u0928\u0940',
    'loans.overdue': '\u092E\u094D\u092F\u093E\u0926 \u0928\u093E\u0918\u0947\u0915\u094B',
    'loans.repayment': '\u092D\u0941\u0915\u094D\u0924\u093E\u0928\u0940',
    'loans.addRepayment': '\u092D\u0941\u0915\u094D\u0924\u093E\u0928\u0940 \u0925\u092A\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'loans.amortization': '\u0915\u093F\u0938\u094D\u0924\u093E \u0924\u093E\u0932\u093F\u0915\u093E',
    'loans.documents': '\u0915\u093E\u0917\u091C\u093E\u0924\u0939\u0930\u0942',
    'loans.uploadDocument': '\u0915\u093E\u0917\u091C\u093E\u0924 \u0905\u092A\u0932\u094B\u0921',
    'loans.penalty': '\u091C\u0930\u093F\u0935\u093E\u0928\u093E',
    'loans.totalInterest': '\u0915\u0941\u0932 \u092C\u094D\u092F\u093E\u091C',
    'loans.totalRepayable': '\u0915\u0941\u0932 \u0924\u093F\u0930\u094D\u0928\u0941\u092A\u0930\u094D\u0928\u0947',
    'loans.emiCalculator': 'EMI \u0915\u094D\u092F\u093E\u0932\u0915\u0941\u0932\u0947\u091F\u0930',
    'loans.principal': '\u092E\u0942\u0932 \u0930\u0915\u092E',

    // Reports
    'reports.title': '\u092A\u094D\u0930\u0924\u093F\u0935\u0947\u0926\u0928',
    'reports.generate': '\u092A\u094D\u0930\u0924\u093F\u0935\u0947\u0926\u0928 \u092C\u0928\u093E\u0909\u0928\u0941\u0939\u094B\u0938\u094D',
    'reports.period': '\u0905\u0935\u0927\u093F',
    'reports.daily': '\u0926\u0948\u0928\u093F\u0915',
    'reports.weekly': '\u0938\u093E\u092A\u094D\u0924\u093E\u0939\u093F\u0915',
    'reports.fortnightly': '\u092A\u093E\u0915\u094D\u0937\u093F\u0915',
    'reports.monthly': '\u092E\u093E\u0938\u093F\u0915',
    'reports.trimester': '\u0924\u094D\u0930\u0948\u092E\u093E\u0938\u093F\u0915',
    'reports.semiAnnual': '\u096C \u092E\u0939\u093F\u0928\u093E',
    'reports.yearly': '\u0935\u093E\u0930\u094D\u0937\u093F\u0915',
    'reports.summary': '\u0938\u093E\u0930\u093E\u0902\u0936',
    'reports.memberSavings': '\u0938\u0926\u0938\u094D\u092F \u092C\u091A\u0924',
    'reports.loanPortfolio': '\u0990\u0923 \u092A\u094B\u0930\u094D\u091F\u092B\u094B\u0932\u093F\u092F\u094B',
    'reports.incomeStatement': '\u0906\u092F \u0935\u093F\u0935\u0930\u0923',
    'reports.balanceSheet': '\u0935\u093E\u0938\u0932\u093E\u0924',
    'reports.overdueLoans': '\u092E\u094D\u092F\u093E\u0926 \u0928\u093E\u0918\u0947\u0915\u093E \u0990\u0923',
    'reports.print': '\u091B\u093E\u092A\u094D\u0928\u0941\u0939\u094B\u0938\u094D',

    // Settings
    'settings.title': '\u0938\u0947\u091F\u093F\u0919\u094D\u0938',
    'settings.orgName': '\u0938\u0902\u0938\u094D\u0925\u093E\u0915\u094B \u0928\u093E\u092E',
    'settings.currency': '\u092E\u0941\u0926\u094D\u0930\u093E',
    'settings.interestRate': '\u092A\u0942\u0930\u094D\u0935\u0928\u093F\u0930\u094D\u0927\u093E\u0930\u093F\u0924 \u092C\u094D\u092F\u093E\u091C \u0926\u0930',
    'settings.penaltyRate': '\u092A\u0942\u0930\u094D\u0935\u0928\u093F\u0930\u094D\u0927\u093E\u0930\u093F\u0924 \u091C\u0930\u093F\u0935\u093E\u0928\u093E \u0926\u0930',
    'settings.minSavings': '\u0928\u094D\u092F\u0942\u0928\u0924\u092E \u092C\u091A\u0924',
    'settings.meetingFrequency': '\u092C\u0948\u0920\u0915 \u0906\u0935\u0943\u0924\u094D\u0924\u093F',
    'settings.fiscalYear': '\u0906\u0930\u094D\u0925\u093F\u0915 \u0935\u0930\u094D\u0937',
    'settings.fiscalYearStart': '\u0906\u0930\u094D\u0925\u093F\u0915 \u0935\u0930\u094D\u0937 \u0938\u0941\u0930\u0941',
    'settings.save': '\u0938\u0947\u091F\u093F\u0919\u094D\u0938 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'settings.calendar': '\u092A\u093E\u0924\u094D\u0930\u094B \u092A\u094D\u0930\u0923\u093E\u0932\u0940',
    'settings.calendarAD': 'AD (\u0917\u094D\u0930\u0947\u0917\u094B\u0930\u093F\u092F\u0928)',
    'settings.calendarBS': 'BS (\u092C\u093F\u0915\u094D\u0930\u092E \u0938\u092E\u094D\u092C\u0924)',
    'settings.language': '\u092D\u093E\u0937\u093E',
    'settings.balanceAdjustments': '\u0936\u0947\u0937 \u0938\u092E\u093E\u092F\u094B\u091C\u0928',

    // Common
    'common.save': '\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'common.cancel': '\u0930\u0926\u094D\u0926 \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'common.delete': '\u092E\u0947\u091F\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'common.edit': '\u0938\u092E\u094D\u092A\u093E\u0926\u0928',
    'common.add': '\u0925\u092A\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'common.search': '\u0916\u094B\u091C\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'common.filter': '\u092B\u093F\u0932\u094D\u091F\u0930',
    'common.all': '\u0938\u092C\u0948',
    'common.loading': '\u0932\u094B\u0921 \u0939\u0941\u0901\u0926\u0948\u091B...',
    'common.noData': '\u0915\u0941\u0928\u0948 \u0921\u093E\u091F\u093E \u0909\u092A\u0932\u092C\u094D\u0927 \u091B\u0948\u0928',
    'common.confirm': '\u092A\u0941\u0937\u094D\u091F\u093F \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'common.success': '\u0938\u092B\u0932',
    'common.error': '\u0924\u094D\u0930\u0941\u091F\u093F',
    'common.actions': '\u0915\u093E\u0930\u094D\u092F\u0939\u0930\u0942',
    'common.back': '\u092A\u091B\u093E\u0921\u093F',
    'common.next': '\u0905\u0930\u094D\u0915\u094B',
    'common.previous': '\u0905\u0918\u093F\u0932\u094D\u0932\u094B',
    'common.total': '\u091C\u092E\u094D\u092E\u093E',
    'common.print': '\u091B\u093E\u092A\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
    'common.export': '\u0928\u093F\u0930\u094D\u092F\u093E\u0924',
    'common.download': '\u0921\u093E\u0909\u0928\u0932\u094B\u0921',
    'common.upload': '\u0905\u092A\u0932\u094B\u0921',
    'common.yes': '\u0939\u094B',
    'common.no': '\u0939\u094B\u0907\u0928',
    'common.credit': '\u091C\u092E\u094D\u092E\u093E',
    'common.debit': '\u0916\u0930\u094D\u091A',
    'common.reason': '\u0915\u093E\u0930\u0923',

    // Auth
    'auth.login': '\u0932\u0917 \u0907\u0928',
    'auth.logout': '\u0932\u0917 \u0906\u0909\u091F',
    'auth.username': '\u092A\u094D\u0930\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0928\u093E\u092E',
    'auth.password': '\u092A\u093E\u0938\u0935\u0930\u094D\u0921',
    'auth.welcome': '\u0938\u094D\u0935\u093E\u0917\u0924 \u091B',
    'auth.signInToContinue': '\u0906\u092B\u094D\u0928\u094B \u0916\u093E\u0924\u093E\u092E\u093E \u0932\u0917 \u0907\u0928 \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D',
  }
};

// Nepali numeral mapping
const nepaliNumerals = ['\u0966', '\u0967', '\u0968', '\u0969', '\u096A', '\u096B', '\u096C', '\u096D', '\u096E', '\u096F'];

/**
 * Get translation for a key in the given language.
 * Falls back to English if the key is not found in the target language.
 * Returns the key itself if not found in any language.
 */
export function t(key, lang = 'en') {
  if (translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  // Fallback to English
  if (translations.en && translations.en[key]) {
    return translations.en[key];
  }
  // Return the key itself as last resort
  return key;
}

/**
 * Convert a number string to Nepali numerals.
 */
function toNepaliNumerals(str) {
  return String(str).replace(/[0-9]/g, (digit) => nepaliNumerals[parseInt(digit, 10)]);
}

/**
 * Format a number with locale-appropriate formatting.
 * Uses Nepali numerals and South Asian grouping for 'ne'.
 */
export function formatNumber(num, lang = 'en') {
  if (num == null || isNaN(num)) return '';

  const number = Number(num);
  const isNegative = number < 0;
  const absNum = Math.abs(number);

  // Split into integer and decimal parts
  const parts = absNum.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Apply South Asian grouping (first group of 3, then groups of 2)
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = grouped + ',' + lastThree;
  }

  let formatted = integerPart + '.' + decimalPart;
  if (isNegative) formatted = '-' + formatted;

  if (lang === 'ne') {
    return toNepaliNumerals(formatted);
  }

  return formatted;
}

/**
 * Format currency with locale-appropriate symbol, grouping, and numerals.
 * Supports NPR (Nepali Rupees) and USD.
 */
export function formatCurrency(amount, currency = 'NPR', lang = 'en') {
  if (amount == null || isNaN(amount)) return '';

  const formattedNum = formatNumber(amount, lang);

  const symbols = {
    NPR: lang === 'ne' ? '\u0930\u0941.' : 'Rs.',
    USD: '$',
    INR: lang === 'ne' ? '\u0930\u0941.' : 'Rs.',
  };

  const symbol = symbols[currency] || currency;

  return `${symbol} ${formattedNum}`;
}

/**
 * Get the display name of a language given its code.
 */
export function getLanguageName(code) {
  const names = {
    en: 'English',
    ne: '\u0928\u0947\u092A\u093E\u0932\u0940',
  };
  return names[code] || code;
}

export { translations };
export default translations;
