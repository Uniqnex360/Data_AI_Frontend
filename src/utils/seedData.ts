import api from "../lib/api.ts";

export async function seedBusinessRules() {
  const rules = [
    {
      rule_id: 'price_positive',
      attribute_name: 'price',
      rule_type: 'validation',
      rule_config: { min: 0, required: true },
      active: true
    },
    {
      rule_id: 'ip_rating_enum',
      attribute_name: 'ip_rating',
      rule_type: 'enum',
      rule_config: {
        allowed_values: ['IP20', 'IP44', 'IP54', 'IP65', 'IP67', 'IP68']
      },
      active: true
    },
    {
      rule_id: 'mounting_type_enum',
      attribute_name: 'mounting_type',
      rule_type: 'enum',
      rule_config: {
        allowed_values: ['Surface Mount', 'Recessed', 'Pendant', 'Track', 'Wall Mount']
      },
      active: true
    },
    {
      rule_id: 'screen_size_range',
      attribute_name: 'screen_size',
      rule_type: 'range',
      rule_config: { min: 1, max: 100 },
      active: true
    },
    {
      rule_id: 'sku_format',
      attribute_name: 'sku',
      rule_type: 'format',
      rule_config: { pattern: '^[A-Z0-9]{3,20}$' },
      active: true
    }
  ];

  try {
    await api.post('/rules/seed', { rules });
    console.log("Business rules synchronized with Python backend.");
  } catch (error) {
    console.error("Failed to seed business rules:", error);
  }
}