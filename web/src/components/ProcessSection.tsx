import { processSteps, type ProcessStep } from "../data/homeContent";
import {
  CheckCircleIcon,
  ClipboardCheckIcon,
  SearchIcon,
  UserCheckIcon,
} from "./Icon";

function StepIcon({ icon }: { icon: ProcessStep["icon"] }) {
  switch (icon) {
    case "search":
      return <SearchIcon />;
    case "clipboard":
      return <ClipboardCheckIcon />;
    case "user":
      return <UserCheckIcon />;
    case "check":
      return <CheckCircleIcon />;
  }
}

export default function ProcessSection() {
  return (
    <section className="section center">
      <div className="eyebrow">QUY CHUẨN THỦ TỤC</div>
      <h2>Quy trình đặt và sử dụng phòng</h2>
      <p className="section-desc">
        Vui lòng tuân thủ 4 bước vận hành để bảo đảm quyền lợi và duy trì văn
        hóa không gian học thuật tại HUIT.
      </p>
      <div className="steps-grid">
        {processSteps.map((s) => (
          <article key={s.no} className="step-card">
            <div className="step-top">
              <span className="step-no">{s.no}</span>
              <span className={s.tone === "red" ? "step-icon red" : "step-icon"}>
                <StepIcon icon={s.icon} />
              </span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
            <div className={s.tone === "red" ? "step-foot red" : "step-foot"}>
              {s.foot}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
