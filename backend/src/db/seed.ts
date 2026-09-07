import { db } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('🌱 Starting realistic demo database seeding...');
  const startTime = Date.now();

  try {
    // Wrap the entire seeding process inside a transaction for atomicity
    await db.transaction(async (tx) => {
      // Clear old data
      console.log('🧹 Clearing existing database tables...');
      await tx.delete(schema.loanSchedules);
      await tx.delete(schema.loanDetails);
      await tx.delete(schema.transactions);
      await tx.delete(schema.accounts);
      await tx.delete(schema.customers);
      await tx.delete(schema.bankers);
      await tx.delete(schema.branches);

      const hashedPassword = await bcrypt.hash('Banker@123', 10);

      // 1. Two branches
      await tx.insert(schema.branches).values([
        {
          branch_id: 'BLR001',
          branch_name: 'Bengaluru Central Branch',
          ifsc_code: 'BLR0001001',
          address: 'MG Road, Bengaluru',
        },
        {
          branch_id: 'BLR002',
          branch_name: 'Bengaluru Tech Park Branch',
          ifsc_code: 'BLR0001002',
          address: 'Electronic City Phase 1, Bengaluru',
        },
      ]);

      // 2. One banker per branch
      await tx.insert(schema.bankers).values([
        {
          banker_id: 'BA00001',
          employee_id: 'EMP1001',
          name: 'Ananya Rao',
          password_hash: hashedPassword,
          branch_id: 'BLR001',
        },
        {
          banker_id: 'BA00002',
          employee_id: 'EMP1002',
          name: 'Arjun Mehta',
          password_hash: hashedPassword,
          branch_id: 'BLR002',
        },
      ]);

      // Realistic demo customers
      const branch1Customers = [
        ['Aarav', 'Sharma', '1993-04-12', 'Male', 'Married', '9876501001', 'aarav.sharma@example.com', 'Koramangala'],
        ['Priya', 'Nair', '1995-08-23', 'Female', 'Single', '9876501002', 'priya.nair@example.com', 'Indiranagar'],
        ['Rohan', 'Mehta', '1989-11-05', 'Male', 'Married', '9876501003', 'rohan.mehta@example.com', 'Jayanagar'],
        ['Sneha', 'Iyer', '1994-02-17', 'Female', 'Married', '9876501004', 'sneha.iyer@example.com', 'HSR Layout'],
        ['Vikram', 'Reddy', '1987-06-29', 'Male', 'Married', '9876501005', 'vikram.reddy@example.com', 'BTM Layout'],
        ['Neha', 'Kapoor', '1996-09-14', 'Female', 'Single', '9876501006', 'neha.kapoor@example.com', 'Whitefield'],
        ['Karan', 'Malhotra', '1991-12-02', 'Male', 'Married', '9876501007', 'karan.malhotra@example.com', 'Rajajinagar'],
        ['Divya', 'Sharma', '1997-03-21', 'Female', 'Single', '9876501008', 'divya.sharma@example.com', 'Malleshwaram'],
        ['Aditya', 'Verma', '1990-07-18', 'Male', 'Married', '9876501009', 'aditya.verma@example.com', 'Banashankari'],
        ['Megha', 'Joshi', '1993-10-30', 'Female', 'Married', '9876501010', 'megha.joshi@example.com', 'Basavanagudi'],
        ['Rahul', 'Gupta', '1988-05-09', 'Male', 'Married', '9876501011', 'rahul.gupta@example.com', 'Yeshwanthpur'],
        ['Anjali', 'Patel', '1995-01-26', 'Female', 'Single', '9876501012', 'anjali.patel@example.com', 'Marathahalli'],
        ['Siddharth', 'Rao', '1992-04-03', 'Male', 'Single', '9876501013', 'siddharth.rao@example.com', 'Bellandur'],
        ['Pooja', 'Bansal', '1994-11-19', 'Female', 'Married', '9876501014', 'pooja.bansal@example.com', 'JP Nagar'],
        ['Nikhil', 'Agarwal', '1986-08-07', 'Male', 'Married', '9876501015', 'nikhil.agarwal@example.com', 'Vijayanagar'],
        ['Aastha', 'Chopra', '1998-02-11', 'Female', 'Single', '9876501016', 'aastha.chopra@example.com', 'Cunningham Road'],
      ];

      const branch2Customers = [
        ['Manish', 'Kulkarni', '1989-03-16', 'Male', 'Married', '9876502001', 'manish.kulkarni@example.com', 'Electronic City'],
        ['Shreya', 'Deshmukh', '1996-07-24', 'Female', 'Single', '9876502002', 'shreya.deshmukh@example.com', 'Hosur Road'],
        ['Gaurav', 'Singh', '1991-10-08', 'Male', 'Married', '9876502003', 'gaurav.singh@example.com', 'Bommasandra'],
        ['Kritika', 'Jain', '1995-05-27', 'Female', 'Married', '9876502004', 'kritika.jain@example.com', 'Sarjapur Road'],
        ['Varun', 'Shah', '1988-12-13', 'Male', 'Married', '9876502005', 'varun.shah@example.com', 'HSR Layout'],
        ['Ritu', 'Mishra', '1993-09-01', 'Female', 'Single', '9876502006', 'ritu.mishra@example.com', 'Electronic City'],
      ];

      const branch1Balances = [
        '82500.00', '145000.00', '63500.00', '218000.00',
        '97500.00', '45200.00', '187500.00', '113000.00',
        '76400.00', '156800.00', '92500.00', '68200.00',
        '124500.00', '89500.00', '231000.00', '57200.00',
      ];

      const branch2Balances = [
        '96500.00', '137000.00', '58200.00',
        '186500.00', '112000.00', '74500.00',
      ];

      const branch1Accounts: string[] = [];
      const branch2Accounts: string[] = [];

      // Helper for customer/account/initial transaction creation
      async function createBranchCustomers(
        customers: string[][],
        branchId: string,
        bankerId: string,
        accountPrefix: string,
        customerPrefix: string,
        balances: string[],
        addressPrefix: string,
      ) {
        const customerRows = [];
        const accountRows = [];
        const transactionRows = [];

        for (let i = 0; i < customers.length; i++) {
          const [
            firstName,
            lastName,
            dob,
            gender,
            maritalStatus,
            mobile,
            email,
            locality,
          ] = customers[i];

          const index = i + 1;
          const customerId = `${customerPrefix}_${String(index).padStart(6, '0')}`;
          const accountNumber = `${accountPrefix}${String(index).padStart(8, '0')}`;
          const balance = balances[i];

          customerRows.push({
            customer_id: customerId,
            first_name: firstName,
            last_name: lastName,
            dob,
            gender,
            marital_status: maritalStatus,
            primary_mobile: mobile,
            secondary_phone: null,
            email,
            pan: `${branchId === 'BLR001' ? 'ABCD' : 'WXYZ'}${String(index).padStart(5, '0')}F`,
            aadhaar: `MOCK-AADH-${branchId}-${String(index).padStart(8, '0')}`,
            address_line1: `${addressPrefix}, ${locality}`,
            city: 'Bengaluru',
            state: 'Karnataka',
            postal_code: branchId === 'BLR001' ? '560001' : '560100',
            country: 'India',
          });

          const accountType = i % 4 === 0 ? 'CURRENT' : 'SAVINGS';

          accountRows.push({
            account_number: accountNumber,
            customer_id: customerId,
            branch_id: branchId,
            account_type: accountType,
            balance,
            min_balance: accountType === 'SAVINGS' ? '500.00' : '5000.00',
            status: 'ACTIVE',
          });

          transactionRows.push({
            ref_number: `DEP-${branchId}-${String(index).padStart(4, '0')}`,
            from_account: null,
            to_account: accountNumber,
            type: 'INITIAL_DEPOSIT',
            amount: balance,
            balance_after: balance,
            banker_id: bankerId,
            description: `Opening account deposit for ${firstName} ${lastName}`,
          });
        }

        await tx.insert(schema.customers).values(customerRows);
        await tx.insert(schema.accounts).values(accountRows);
        await tx.insert(schema.transactions).values(transactionRows);

        return accountRows.map((account) => account.account_number);
      }

      // 3. BLR001: 16 customers
      console.log('👥 Creating 16 customers for BLR001...');
      const accounts1 = await createBranchCustomers(
        branch1Customers,
        'BLR001',
        'BA00001',
        '1001',
        'CUST1',
        branch1Balances,
        'Flat/House',
      );
      branch1Accounts.push(...accounts1);

      // 4. BLR002: 6 customers
      console.log('👥 Creating 6 customers for BLR002...');
      const accounts2 = await createBranchCustomers(
        branch2Customers,
        'BLR002',
        'BA00002',
        '2002',
        'CUST2',
        branch2Balances,
        'Flat/House',
      );
      branch2Accounts.push(...accounts2);

      // Additional realistic account transactions.
      const additionalTransactions = [
        {
          ref_number: 'TXN-BLR001-001',
          from_account: null,
          to_account: branch1Accounts[0],
          type: 'INITIAL_DEPOSIT',
          amount: '25000.00',
          balance_after: '107500.00',
          banker_id: 'BA00001',
          description: 'Salary credit - Aarav Sharma',
        },
        {
          ref_number: 'TXN-BLR001-002',
          from_account: branch1Accounts[1],
          to_account: null,
          type: 'WITHDRAWAL',
          amount: '12000.00',
          balance_after: '133000.00',
          banker_id: 'BA00001',
          description: 'ATM cash withdrawal - Priya Nair',
        },
        {
          ref_number: 'TXN-BLR001-003',
          from_account: null,
          to_account: branch1Accounts[2],
          type: 'INITIAL_DEPOSIT',
          amount: '18000.00',
          balance_after: '81500.00',
          banker_id: 'BA00001',
          description: 'Salary credit - Rohan Mehta',
        },
        {
          ref_number: 'TXN-BLR001-004',
          from_account: branch1Accounts[3],
          to_account: null,
          type: 'WITHDRAWAL',
          amount: '15000.00',
          balance_after: '203000.00',
          banker_id: 'BA00001',
          description: 'Utility and household payment - Sneha Iyer',
        },
        {
          ref_number: 'TXN-BLR001-005',
          from_account: branch1Accounts[6],
          to_account: null,
          type: 'WITHDRAWAL',
          amount: '8500.00',
          balance_after: '179000.00',
          banker_id: 'BA00001',
          description: 'Business expense payment - Karan Malhotra',
        },
        {
          ref_number: 'TXN-BLR002-001',
          from_account: null,
          to_account: branch2Accounts[0],
          type: 'INITIAL_DEPOSIT',
          amount: '22000.00',
          balance_after: '118500.00',
          banker_id: 'BA00002',
          description: 'Salary credit - Manish Kulkarni',
        },
        {
          ref_number: 'TXN-BLR002-002',
          from_account: branch2Accounts[1],
          to_account: null,
          type: 'WITHDRAWAL',
          amount: '10000.00',
          balance_after: '127000.00',
          banker_id: 'BA00002',
          description: 'Household payment - Shreya Deshmukh',
        },
        {
          ref_number: 'TXN-BLR002-003',
          from_account: null,
          to_account: branch2Accounts[3],
          type: 'INITIAL_DEPOSIT',
          amount: '30000.00',
          balance_after: '216500.00',
          banker_id: 'BA00002',
          description: 'Business income credit - Kritika Jain',
        },
      ];

      await tx.insert(schema.transactions).values(additionalTransactions);

      // Keep account balances consistent with the additional transactions.
      await tx.update(schema.accounts)
        .set({ balance: '107500.00' })
        .where(sql`account_number = ${branch1Accounts[0]}`);

      await tx.update(schema.accounts)
        .set({ balance: '133000.00' })
        .where(sql`account_number = ${branch1Accounts[1]}`);

      await tx.update(schema.accounts)
        .set({ balance: '81500.00' })
        .where(sql`account_number = ${branch1Accounts[2]}`);

      await tx.update(schema.accounts)
        .set({ balance: '203000.00' })
        .where(sql`account_number = ${branch1Accounts[3]}`);

      await tx.update(schema.accounts)
        .set({ balance: '179000.00' })
        .where(sql`account_number = ${branch1Accounts[6]}`);

      await tx.update(schema.accounts)
        .set({ balance: '118500.00' })
        .where(sql`account_number = ${branch2Accounts[0]}`);

      await tx.update(schema.accounts)
        .set({ balance: '127000.00' })
        .where(sql`account_number = ${branch2Accounts[1]}`);

      await tx.update(schema.accounts)
        .set({ balance: '216500.00' })
        .where(sql`account_number = ${branch2Accounts[3]}`);

      function calculateEmi(
        principal: number,
        annualInterestRate: number,
        tenureMonths: number,
      ) {
        const monthlyRate = annualInterestRate / 12 / 100;

        if (monthlyRate === 0) {
            return Number((principal / tenureMonths).toFixed(2));
        }

        const emi =
            (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        return Number(emi.toFixed(2));
      }

      // ============================================================
      // 5. TWO LOANS TOTAL
      //    - One loan in BLR001
      //    - One loan in BLR002
      // ============================================================

      async function createLoan(
        targetAccountNum: string,
        branchId: string,
        bankerId: string,
        principal: number,
        interestRate: number,
        tenureMonths: number,
        loanRef: string,
      ) {
        const monthlyEmi = calculateEmi(
            principal,
            interestRate,
            tenureMonths,
        );
        const [accRecord] = await tx
          .select()
          .from(schema.accounts)
          .where(sql`account_number = ${targetAccountNum}`);

        if (!accRecord) {
          throw new Error(`Account not found: ${targetAccountNum}`);
        }

        const loanAccountNumber = `${targetAccountNum}_LN`;

        await tx.insert(schema.accounts).values({
          account_number: loanAccountNumber,
          customer_id: accRecord.customer_id,
          branch_id: branchId,
          account_type: 'LOAN',
          balance: '0.00',
          min_balance: '0.00',
          status: 'ACTIVE',
        });

        await tx.insert(schema.loanDetails).values({
          loan_account_number: loanAccountNumber,
          disbursal_account_number: targetAccountNum,
          principal_amount: principal.toFixed(2),
          interest_rate: interestRate.toFixed(2),
          tenure_months: tenureMonths,
          monthly_emi: monthlyEmi.toFixed(2),
          remaining_amount: (monthlyEmi * tenureMonths).toFixed(2),
        });

        const monthlyRate = interestRate / 12 / 100;
        let balance = principal;
        const scheduleRows = [];
        const startDate = new Date();

        for (let m = 1; m <= tenureMonths; m++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(startDate.getMonth() + m);

          const interestComp = balance * monthlyRate;
          const principalComp = monthlyEmi - interestComp;
          balance = Math.max(0, balance - principalComp);

          scheduleRows.push({
            loan_account_number: loanAccountNumber,
            installment_no: m,
            due_date: dueDate.toISOString().split('T')[0],
            principal_component: principalComp.toFixed(2),
            interest_component: interestComp.toFixed(2),
            emi_amount: monthlyEmi.toFixed(2),
            remaining_amount: balance.toFixed(2),
            status: 'PENDING',
          });
        }

        await tx.insert(schema.loanSchedules).values(scheduleRows);

        const newBalance = (Number(accRecord.balance) + principal).toFixed(2);

        await tx.update(schema.accounts)
          .set({ balance: newBalance })
          .where(sql`account_number = ${targetAccountNum}`);

        await tx.insert(schema.transactions).values({
          ref_number: loanRef,
          from_account: loanAccountNumber,
          to_account: targetAccountNum,
          type: 'LOAN_DISBURSAL',
          amount: principal.toFixed(2),
          balance_after: newBalance,
          banker_id: bankerId,
          description: `Loan disbursal for ${loanAccountNumber}`,
        });

        return loanAccountNumber;
      }

      // Aarav Sharma - BLR001 - Home improvement/personal loan
      await createLoan(
        branch1Accounts[0],
        'BLR001',
        'BA00001',
        200000,
        10.5,
        36,
        'DSB1-000001',
      );

      // Manish Kulkarni - BLR002 - Vehicle loan
      await createLoan(
        branch2Accounts[0],
        'BLR002',
        'BA00002',
        150000,
        11.0,
        36,
        'DSB2-000001',
      );
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('✅ Realistic demo database seeding completed!');
    console.log(`🏢 Branches: 2`);
    console.log(`👨‍💼 Bankers: 2 (1 per branch)`);
    console.log(`👥 BLR001 customers: ${branch1Customers.length}`);
    console.log(`👥 BLR002 customers: ${branch2Customers.length}`);
    console.log(`💸 Loans: 2`);
    console.log(`⏱️ Completed in ${duration} seconds`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();