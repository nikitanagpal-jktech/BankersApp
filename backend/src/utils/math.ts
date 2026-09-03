export const DecimalMath = {
  add: (a: string | number, b: string | number): string => {
    const intA = Math.round(Number(a) * 100);
    const intB = Math.round(Number(b) * 100);
    return ((intA + intB) / 100).toFixed(2);
  },

  subtract: (a: string | number, b: string | number): string => {
    const intA = Math.round(Number(a) * 100);
    const intB = Math.round(Number(b) * 100);
    return ((intA - intB) / 100).toFixed(2);
  },

  isLessThan: (a: string | number, b: string | number): boolean => {
    return Math.round(Number(a) * 100) < Math.round(Number(b) * 100);
  },

  calculateEmi: (principal: number, annualRate: number, months: number): { emi: string; totalPayable: string } => {
    const monthlyRate = annualRate / 12 / 100;
    let emiVal = 0;
    if (monthlyRate === 0) {
      emiVal = principal / months;
    } else {
      emiVal = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    }
    const emi = emiVal.toFixed(2);
    const totalPayable = (emiVal * months).toFixed(2);
    return { emi, totalPayable };
  },
};