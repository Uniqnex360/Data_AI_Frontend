export const safeParseValue = (value: any): any => {
    if (typeof value !== "string") return value;
    const str = value.trim();
    if (
      (str.startsWith("{") && str.endsWith("}")) ||
      (str.startsWith("[") && str.endsWith("]"))
    ) {
      try {
        return JSON.parse(str);
      } catch {
        try {
          const pythonLikeStr = str
            .replace(/'/g, '"')
            .replace(/None/g, "null")
            .replace(/True/g, "true")
            .replace(/False/g, "false");
          return JSON.parse(pythonLikeStr);
        } catch (e) {
          return str;
        }
      }
    }
    return str;
  };
  export const formatValue = (value: any): JSX.Element | string => {
      if (value === null || value === undefined || value === "") {
        return <span className="text-slate-400">-</span>;
      }
      let parsedValue = safeParseValue(value);
      while (typeof parsedValue === "string" && parsedValue !== value) {
        value = parsedValue;
        parsedValue = safeParseValue(value);
      }
      if (typeof parsedValue === "object" && parsedValue !== null) {
        if (Array.isArray(parsedValue)) {
          if (parsedValue.length === 0) {
            return <span className="text-slate-400">-</span>;
          }
          return parsedValue.join(", ");
        } else {
          if ("standard_value" in parsedValue || "value" in parsedValue) {
            const displayValue = parsedValue.standard_value ?? parsedValue.value;
            const uom = parsedValue.uom ?? parsedValue.unit;
            return (
              <span>
                {String(displayValue)}
                {uom && <span className="ml-1 text-slate-500">{uom}</span>}
              </span>
            );
          }
          return JSON.stringify(parsedValue);
        }
      }
      return String(parsedValue);
    };