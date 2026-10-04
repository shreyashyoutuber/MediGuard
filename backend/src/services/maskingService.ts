export function maskValue(field: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);

  switch (field) {
    case 'phone': {
      if (str.length >= 6) return str.slice(0, 3) + '****' + str.slice(-3);
      return '****';
    }
    case 'email': {
      const [local, domain] = str.split('@');
      if (local && domain) return local[0] + '*'.repeat(Math.max(1, local.length - 1)) + '@' + domain;
      return '****@****';
    }
    case 'government_id': {
      if (str.length >= 4) return '*'.repeat(str.length - 4) + str.slice(-4);
      return '****';
    }
    case 'name': {
      return str.split(' ').map(w => w[0] + '*'.repeat(Math.max(1, w.length - 1))).join(' ');
    }
    case 'emergency_contact': {
      if (str.length >= 6) return str.slice(0, 3) + '****' + str.slice(-3);
      return '****';
    }
    case 'insurance_id': {
      if (str.length >= 4) return '*'.repeat(str.length - 4) + str.slice(-4);
      return '****';
    }
    case 'billing_amount': {
      return '₹ ***,***';
    }
    case 'diagnosis':
    case 'medical_history':
    case 'lab_reports_summary':
    case 'medical_images_ref':
      return '[MASKED — Insufficient clearance]';
    default:
      if (str.length > 4) return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
      return '****';
  }
}
