import React, { useMemo } from "react";
import { generate24hTimeOptions } from "../../lib/dateTimeFormat";

export interface TimeSelect24hProps {
  id?: string;
  name?: string;
  value?: string;
  onChange: (value: string) => void;
  minTime?: string;
  maxTime?: string;
  stepMinutes?: number;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const TimeSelect24h: React.FC<TimeSelect24hProps> = ({
  id,
  name,
  value,
  onChange,
  minTime = "06:00",
  maxTime = "22:00",
  stepMinutes = 15,
  className = "admin-input",
  disabled = false,
  required = false,
  placeholder,
  style,
}) => {
  const options = useMemo(() => {
    const list = generate24hTimeOptions(minTime, maxTime, stepMinutes);
    // Nếu giá trị hiện tại có dữ liệu nhưng không khớp bước nhảy, tự động thêm vào để không bị mất giá trị
    const valTrim = (value || "").slice(0, 5);
    if (valTrim && !list.includes(valTrim)) {
      list.push(valTrim);
      list.sort();
    }
    return list;
  }, [minTime, maxTime, stepMinutes, value]);

  // Chuẩn hóa value chỉ lấy HH:mm (trường hợp value có dạng HH:mm:ss)
  const normalizedValue = (value || "").slice(0, 5);

  return (
    <select
      id={id}
      name={name}
      className={className}
      value={normalizedValue}
      disabled={disabled}
      required={required}
      style={{ fontFamily: "monospace, system-ui", ...style }}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
};
export default TimeSelect24h;
