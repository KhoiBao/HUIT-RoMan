import { processSteps, type ProcessStep } from "../data/homeContent";
import {
  CheckCircleIcon,
  ChevronRightIcon,
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
    <section className="rh-process" id="quy-trinh" aria-labelledby="rh-process-title">
      <div className="rh-container">
        <div className="rh-section-head center">
          <div>
            <span className="rh-eyebrow">Hướng dẫn thao tác</span>
            <h2 id="rh-process-title">Quy trình 4 bước đặt &amp; sử dụng phòng</h2>
            <p className="rh-lead">
              Thực hiện đúng quy trình để bảo đảm quyền lợi và duy trì văn hóa
              sử dụng không gian học thuật tại HUIT.
            </p>
          </div>
        </div>

        <div className="rh-process-panel">
          {processSteps.map((step, index) => (
            <article key={step.no} className="rh-process-step">
              <div className="rh-step-top">
                <span className="rh-step-no">{step.no}</span>
                <span
                  className={`rh-step-icon ${
                    step.tone === "red" ? "is-red" : ""
                  }`}
                >
                  <StepIcon icon={step.icon} />
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              <span
                className={`rh-step-foot ${step.tone === "red" ? "is-red" : ""}`}
              >
                {step.foot}
              </span>
              {index < processSteps.length - 1 && (
                <span className="rh-step-connector" aria-hidden="true">
                  <ChevronRightIcon size={18} />
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
