import { addMonths, format } from 'date-fns';

export function calculateMonthlyEmi(
  principal: number,
  annualRate: number,
  tenureMonths: number,
): number {
  if (annualRate === 0) {
    return Number((principal / tenureMonths).toFixed(2));
  }

  const monthlyRate = annualRate / 12 / 100;

  const emi =
    (principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  return Number(emi.toFixed(2));
}

export function generateLoanSchedule(
  loanAccountNumber: string,
  principal: number,
  annualRate: number,
  tenureMonths: number,
  emi: number,
  startDate: Date,
) {
  const monthlyRate = annualRate / 12 / 100;
  let balance = principal;

  return Array.from({ length: tenureMonths }, (_, index) => {
    const installmentNo = index + 1;

    const dueDate = addMonths(startDate, installmentNo);

    const interest =
      monthlyRate === 0
        ? 0
        : Number((balance * monthlyRate).toFixed(2));

    let principalComponent = Number(
      (emi - interest).toFixed(2),
    );

    if (installmentNo === tenureMonths) {
      principalComponent = Number(balance.toFixed(2));
    }

    const emiAmount = Number(
      (principalComponent + interest).toFixed(2),
    );

    balance = Math.max(
      0,
      Number((balance - principalComponent).toFixed(2)),
    );

    return {
      loan_account_number: loanAccountNumber,
      installment_no: installmentNo,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      principal_component: principalComponent.toFixed(2),
      interest_component: interest.toFixed(2),
      emi_amount: emiAmount.toFixed(2),
      remaining_amount: emiAmount.toFixed(2),
      status: 'PENDING',
      paid_at: null,
    };
  });
}