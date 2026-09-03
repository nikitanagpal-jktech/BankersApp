import { db } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('🌱 Starting multi-branch synchronized database seeding...');
  const startTime = Date.now();

  try {
    // 🧹 AUTOMATIC CLEANUP: Clear old data to prevent duplicate key errors
    console.log('🧹 Clearing existing database tables...');
    await db.delete(schema.loanSchedules);
    await db.delete(schema.loanDetails);
    await db.delete(schema.transactions);
    await db.delete(schema.accounts);
    await db.delete(schema.customers);
    await db.delete(schema.bankers);
    await db.delete(schema.branches);

    // 1. Securely Hash Password
    const hashedPassword = await bcrypt.hash('Banker@123', 10);

    // 2. Insert Branches
    console.log('🏢 Setting up branches (BLR001 & BLR002)...');
    await db.insert(schema.branches).values([
      {
        branch_id: 'BLR001',
        branch_name: 'Bengaluru Central Branch',
        ifsc_code: 'BLR0001001',
        address: 'MG Road, Financial District, Bengaluru',
      },
      {
        branch_id: 'BLR002',
        branch_name: 'Bengaluru Tech Park Branch',
        ifsc_code: 'BLR0001002',
        address: 'Electronic City Phase 1, Bengaluru',
      },
    ]).onConflictDoNothing();

    // 3. Insert Branch Bankers
    console.log('👨‍💼 Setting up designated branch bankers...');
    await db.insert(schema.bankers).values([
      {
        banker_id: 'BA00001',
        employee_id: 'EMP1001',
        name: 'Branch Manager BLR001',
        password_hash: hashedPassword,
        branch_id: 'BLR001',
      },
      {
        banker_id: 'BA00002',
        employee_id: 'EMP1002',
        name: 'Branch Manager BLR002',
        password_hash: hashedPassword,
        branch_id: 'BLR002',
      },
    ]).onConflictDoNothing();

    // Real name pools
    const realFirstNames = [
      'Aman', 'Aastha', 'Rohan', 'Priya', 'Rahul', 'Neha', 'Vikram', 'Anjali', 
      'Karan', 'Pooja', 'Abhishek', 'Sneha', 'Aditya', 'Divya', 'Siddharth', 'Megha', 
      'Akash', 'Kritika', 'Varun', 'Swati', 'Manish', 'Tanvi', 'Nikhil', 'Ritu', 
      'Deepak', 'Shreya', 'Gaurav', 'Pallavi', 'Kunal', 'Jyoti'
    ];
    const realLastNames = [
      'Sharma', 'Verma', 'Gupta', 'Kumar', 'Singh', 'Patel', 'Reddy', 'Mehra', 
      'Chopra', 'Malhotra', 'Joshi', 'Mishra', 'Tiwari', 'Saxena', 'Bansal', 'Agarwal', 
      'Iyer', 'Nair', 'Pillai', 'Rao', 'Deshmukh', 'Kulkarni', 'Jadhav', 'Pawar', 
      'Chavan', 'Shinde', 'Gokhale', 'Jain', 'Mehta', 'Shah'
    ];

    // ==========================================
    // BRANCH BLR001: 100,000 Customers & 15 Loans
    // ==========================================
    const TOTAL_CUSTOMERS_BLR1 = 100000;
    const BATCH_SIZE = 500;
    const LOAN_COUNT_BLR1 = 15;

    let createdAccountNumbersBLR1: string[] = [];

    // Pre-select 15 exact customer indices for loans in BLR001
    const selectedIndicesBLR1 = new Set<number>();
    while (selectedIndicesBLR1.size < LOAN_COUNT_BLR1) {
      selectedIndicesBLR1.add(Math.floor(Math.random() * TOTAL_CUSTOMERS_BLR1) + 1);
    }

    console.log(`👥 Generating ${TOTAL_CUSTOMERS_BLR1} customers & accounts for BLR001 in batches...`);

    for (let i = 0; i < TOTAL_CUSTOMERS_BLR1; i += BATCH_SIZE) {
      const customerBatch = [];
      const accountBatch = [];
      const transactionBatch = [];

      for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_CUSTOMERS_BLR1; j++) {
        const index = i + j + 1;
        const paddedIndex = String(index).padStart(6, '0');
        const customerId = `CUST1_${paddedIndex}`;
        const accountNum = `1001${String(index).padStart(8, '0')}`;
        createdAccountNumbersBLR1.push(accountNum);

        const panLetter = String.fromCharCode(65 + Math.floor(index / 10000));
        const panNumber = String(index % 10000).padStart(4, '0');
        const pan = `ABCD${panLetter}${panNumber}F`; 
        const aadhaarMock = `MOCK-AADH-1-${String(index).padStart(8, '0')}`;
        const mobile = `98${String(index).padStart(8, '0')}`.slice(0, 10);

        // If this customer is chosen for a loan, give them a real name
        let firstName, lastName;
        if (selectedIndicesBLR1.has(index)) {
          const nameIndex = index % realFirstNames.length;
          firstName = realFirstNames[nameIndex];
          lastName = realLastNames[nameIndex];
        } else {
          firstName = `User1_${index}`;
          lastName = `LastName${index}`;
        }

        customerBatch.push({
          customer_id: customerId,
          first_name: firstName,
          last_name: lastName,
          dob: '1990-01-01',
          gender: index % 2 === 0 ? 'Male' : 'Female',
          marital_status: 'Single',
          primary_mobile: mobile,
          secondary_phone: null,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@bankmail.test`,
          pan: pan,
          aadhaar: aadhaarMock,
          address_line1: `Street ${index}`,
          city: 'Bengaluru',
          state: 'Karnataka',
          postal_code: '560001',
          country: 'India',
        });

        const accountType = index % 2 === 0 ? 'SAVINGS' : 'CURRENT';
        const initialBalance = (Math.random() * 50000 + 1000).toFixed(2);

        accountBatch.push({
          account_number: accountNum,
          customer_id: customerId,
          branch_id: 'BLR001',
          account_type: accountType,
          balance: initialBalance,
          min_balance: accountType === 'SAVINGS' ? '500.00' : '5000.00',
          status: 'ACTIVE',
        });

        transactionBatch.push({
          ref_number: `DEP1_${Date.now()}_${index}`,
          from_account: null,
          to_account: accountNum,
          type: 'INITIAL_DEPOSIT',
          amount: initialBalance,
          balance_after: initialBalance,
          banker_id: 'BA00001',
          description: `Opening account initial deposit for ${accountNum}`,
        });
      }

      await db.insert(schema.customers).values(customerBatch);
      await db.insert(schema.accounts).values(accountBatch);
      await db.insert(schema.transactions).values(transactionBatch);

      console.log(`BLR001 Progress: ${i + customerBatch.length}/${TOTAL_CUSTOMERS_BLR1} processed.`);
    }

    // Allocate 15 Loans for BLR001 using the pre-selected indices
    console.log(`💸 Allocating ${LOAN_COUNT_BLR1} loans to the pre-selected real-name accounts in BLR001...`);

    for (const idx of selectedIndicesBLR1) {
      const targetAccountNum = createdAccountNumbersBLR1[idx - 1];
      const loanAccountNumber = `${targetAccountNum}_LN`;
      const principal = 100000.00;
      const interestRate = 10.50; 
      const tenureMonths = 24; 
      const monthlyEmi = 4637.60; 

      const [accRecord] = await db.select().from(schema.accounts).where(sql`account_number = ${targetAccountNum}`);
      const currentBalance = Number(accRecord.balance);
      const newBalance = (currentBalance + principal).toFixed(2);

      await db.insert(schema.accounts).values({
        account_number: loanAccountNumber,
        customer_id: accRecord.customer_id,
        branch_id: 'BLR001',
        account_type: 'LOAN',
        balance: '0.00',
        min_balance: '0.00',
        status: 'ACTIVE',
      });

      await db.insert(schema.loanDetails).values({
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

      await db.insert(schema.loanSchedules).values(scheduleRows);

      await db.update(schema.accounts)
        .set({ balance: newBalance })
        .where(sql`account_number = ${targetAccountNum}`);

      await db.insert(schema.transactions).values({
        ref_number: `DSB1-${Math.floor(Math.random() * 900000 + 100000)}`,
        from_account: loanAccountNumber,
        to_account: targetAccountNum,
        type: 'LOAN_DISBURSAL',
        amount: principal.toFixed(2),
        balance_after: newBalance,
        banker_id: 'BA00001',
        description: `Loan Disbursal for loan account ${loanAccountNumber}`,
      });
    }

    // ==========================================
    // BRANCH BLR002: 15 Customers & 1 Loan
    // ==========================================
    const TOTAL_CUSTOMERS_BLR2 = 15;
    const LOAN_COUNT_BLR2 = 1;
    let createdAccountNumbersBLR2: string[] = [];

    console.log(`👥 Generating ${TOTAL_CUSTOMERS_BLR2} customers & accounts for BLR002...`);

    const customerBatchBLR2 = [];
    const accountBatchBLR2 = [];
    const transactionBatchBLR2 = [];

    for (let index = 1; index <= TOTAL_CUSTOMERS_BLR2; index++) {
      const paddedIndex = String(index).padStart(6, '0');
      const customerId = `CUST2_${paddedIndex}`;
      const accountNum = `2002${String(index).padStart(8, '0')}`;
      createdAccountNumbersBLR2.push(accountNum);

      const pan = `WXYZ1${String(index).padStart(4, '0')}F`;
      const aadhaarMock = `MOCK-AADH-2-${String(index).padStart(8, '0')}`;
      const mobile = `97${String(index).padStart(8, '0')}`.slice(0, 10);

      // All 15 customers in BLR002 get real names since the group is small
      const firstName = realFirstNames[(index + 10) % realFirstNames.length];
      const lastName = realLastNames[(index + 10) % realLastNames.length];

      customerBatchBLR2.push({
        customer_id: customerId,
        first_name: firstName,
        last_name: lastName,
        dob: '1992-05-15',
        gender: index % 2 === 0 ? 'Male' : 'Female',
        marital_status: 'Married',
        primary_mobile: mobile,
        secondary_phone: null,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}2_${index}@bankmail.test`,
        pan: pan,
        aadhaar: aadhaarMock,
        address_line1: `Tech Park Street ${index}`,
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: '560100',
        country: 'India',
      });

      const accountType = index % 2 === 0 ? 'SAVINGS' : 'CURRENT';
      const initialBalance = (Math.random() * 50000 + 5000).toFixed(2);

      accountBatchBLR2.push({
        account_number: accountNum,
        customer_id: customerId,
        branch_id: 'BLR002',
        account_type: accountType,
        balance: initialBalance,
        min_balance: accountType === 'SAVINGS' ? '500.00' : '5000.00',
        status: 'ACTIVE',
      });

      transactionBatchBLR2.push({
        ref_number: `DEP2_${Date.now()}_${index}`,
        from_account: null,
        to_account: accountNum,
        type: 'INITIAL_DEPOSIT',
        amount: initialBalance,
        balance_after: initialBalance,
        banker_id: 'BA00002',
        description: `Opening account initial deposit for ${accountNum}`,
      });
    }

    await db.insert(schema.customers).values(customerBatchBLR2);
    await db.insert(schema.accounts).values(accountBatchBLR2);
    await db.insert(schema.transactions).values(transactionBatchBLR2);

    // Allocate 1 Loan for BLR002
    console.log(`💸 Allocating ${LOAN_COUNT_BLR2} loan to a random account in BLR002...`);
    const randomIdxBLR2 = Math.floor(Math.random() * TOTAL_CUSTOMERS_BLR2);
    const targetAccountNumBLR2 = createdAccountNumbersBLR2[randomIdxBLR2];
    const loanAccountNumberBLR2 = `${targetAccountNumBLR2}_LN`;
    const principalBLR2 = 150000.00;
    const interestRateBLR2 = 11.00;
    const tenureMonthsBLR2 = 36;
    const monthlyEmiBLR2 = 4912.21;

    const [accRecordBLR2] = await db.select().from(schema.accounts).where(sql`account_number = ${targetAccountNumBLR2}`);
    const currentBalanceBLR2 = Number(accRecordBLR2.balance);
    const newBalanceBLR2 = (currentBalanceBLR2 + principalBLR2).toFixed(2);

    await db.insert(schema.accounts).values({
      account_number: loanAccountNumberBLR2,
      customer_id: accRecordBLR2.customer_id,
      branch_id: 'BLR002',
      account_type: 'LOAN',
      balance: '0.00',
      min_balance: '0.00',
      status: 'ACTIVE',
    });

    await db.insert(schema.loanDetails).values({
      loan_account_number: loanAccountNumberBLR2,
      disbursal_account_number: targetAccountNumBLR2,
      principal_amount: principalBLR2.toFixed(2),
      interest_rate: interestRateBLR2.toFixed(2),
      tenure_months: tenureMonthsBLR2,
      monthly_emi: monthlyEmiBLR2.toFixed(2),
      remaining_amount: (monthlyEmiBLR2 * tenureMonthsBLR2).toFixed(2),
    });

    const monthlyRateBLR2 = interestRateBLR2 / 12 / 100;
    let balanceBLR2 = principalBLR2;
    const scheduleRowsBLR2 = [];
    const startDateBLR2 = new Date();

    for (let m = 1; m <= tenureMonthsBLR2; m++) {
      const dueDate = new Date(startDateBLR2);
      dueDate.setMonth(startDateBLR2.getMonth() + m);

      const interestComp = balanceBLR2 * monthlyRateBLR2;
      const principalComp = monthlyEmiBLR2 - interestComp;
      balanceBLR2 = Math.max(0, balanceBLR2 - principalComp);

      scheduleRowsBLR2.push({
        loan_account_number: loanAccountNumberBLR2,
        installment_no: m,
        due_date: dueDate.toISOString().split('T')[0],
        principal_component: principalComp.toFixed(2),
        interest_component: interestComp.toFixed(2),
        emi_amount: monthlyEmiBLR2.toFixed(2),
        remaining_amount: balanceBLR2.toFixed(2),
        status: 'PENDING',
      });
    }

    await db.insert(schema.loanSchedules).values(scheduleRowsBLR2);

    await db.update(schema.accounts)
      .set({ balance: newBalanceBLR2 })
      .where(sql`account_number = ${targetAccountNumBLR2}`);

    await db.insert(schema.transactions).values({
      ref_number: `DSB2-${Math.floor(Math.random() * 900000 + 100000)}`,
      from_account: loanAccountNumberBLR2,
      to_account: targetAccountNumBLR2,
      type: 'LOAN_DISBURSAL',
      amount: principalBLR2.toFixed(2),
      balance_after: newBalanceBLR2,
      banker_id: 'BA00002',
      description: `Loan Disbursal for loan account ${loanAccountNumberBLR2}`,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Multi-branch synchronized seeding completed successfully in ${duration} seconds!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding multi-branch database:', error);
    process.exit(1);
  }
}

seedDatabase();