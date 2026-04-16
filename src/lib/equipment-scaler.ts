interface TemplateItem {
  itemName: string;
  baseQuantity: number;
  scalingRule: "per_station" | "fixed" | "per_spirit" | "per_ingredient";
}

interface EventContext {
  stationCount: number;
  spiritCount: number;
  ingredientCount: number;
}

interface ScaledItem {
  itemName: string;
  quantity: number;
}

export function scaleEquipment(
  items: TemplateItem[],
  context: EventContext
): ScaledItem[] {
  const stations = Math.max(context.stationCount, 1);

  return items.map((item) => {
    let multiplier: number;
    switch (item.scalingRule) {
      case "per_station":
        multiplier = stations;
        break;
      case "per_spirit":
        multiplier = Math.max(context.spiritCount, 1);
        break;
      case "per_ingredient":
        multiplier = Math.max(context.ingredientCount, 1);
        break;
      case "fixed":
      default:
        multiplier = 1;
        break;
    }
    return {
      itemName: item.itemName,
      quantity: item.baseQuantity * multiplier,
    };
  });
}
