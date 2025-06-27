// RSVPConfirm.jsx
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import emailjs from "@emailjs/browser";

import { RSVPContext } from "../../context/RSVPContext";
import { useTranslation } from "../../context/TranslationContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";

function RSVPConfirm() {
  const { mainEmail, guests, passportImages } = useContext(RSVPContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sendEmails = async () => {
    const mainParams = {
      firstName: guests[0].firstName,
      to_email: guests[0].email.trim(),
    };

    if (mainParams.to_email) {
      await emailjs.send(
        "service_db6ds6u",
        "template_5okn0xc",
        mainParams,
        "LbaLV0oDELtgaIzeO"
      );
    }

    const additional = guests.slice(1);
    for (const g of additional) {
      if (!g.email.trim()) continue;
      const otherParams = {
        firstName: g.firstName,
        mainFirstName: guests[0].firstName,
        to_email: g.email.trim(),
      };
      await emailjs.send(
        "service_db6ds6u",
        "template_z1crtl9",
        otherParams,
        "LbaLV0oDELtgaIzeO"
      );
    }
  };

  const handleFinalSubmit = async () => {
    try {
      // await sendEmails(); // Enable if needed

      const formData = new FormData();
          const guestsWithPassportFlag = guests.map((guest, idx) => {
            const hasPassport = passportImages.some(img => img.guestIndex === idx);
            return { ...guest, passport: hasPassport ? "yes" : "no" };
          });
      formData.append("mainEmail", mainEmail);
      formData.append("guests", JSON.stringify(guestsWithPassportFlag));

      passportImages.forEach((img) => {
        const index = img.guestIndex;
        if (index == null || !guests[index]) return;

        const g = guests[index];
        const normName = [
          g.firstName,
          g.middleName,
          g.lastName,
          index + 1,
        ]
          .filter(Boolean)
          .join("_")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .toLowerCase();

        const ext = img.file.name.split(".").pop() || "jpg";
        const finalName = `${normName}.${ext}`;

        formData.append("passports", img.file, finalName);
      });

      await axios.post("http://82.169.188.227:3001/submit-rsvp", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/RSVPFinal");
    } catch (err) {
      if (err.response) {
        console.error("🟥 Response error:", err.response.status, err.response.data);
      } else if (err.request) {
        console.error("🟧 Request made but no response:", err.request);
      } else {
        console.error("🟨 General error:", err.message);
      }
      alert(t("confirm.submitError"));
    }
  };

  const handleBack = () => navigate("/passports");

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        <LanguageSwitcher />
      </div>

      <h2>{t("confirm.title")}</h2>
      <p><strong>{t("confirm.mainEmail")}:</strong> {mainEmail}</p>

      {guests.map((g, idx) => (
        <div key={idx} style={{ marginBottom: "1rem", borderBottom: "1px solid #ccc" }}>
          <p><strong>{t("confirm.guest")} {idx + 1}</strong></p>
          <p>{t("confirm.name")}: {g.firstName} {g.middleName} {g.lastName}</p>
          <p>{t("confirm.email")}: {g.email}</p>
          <p>{t("confirm.ageGroup")}: {t(`form.age${g.ageGroup}`)}</p>
          <p>{t("confirm.attendance")}: {t(`form.${g.attendance}`)}</p>
          <p>
            {t("confirm.allergies")}: {g.allergies.map(a => t(`allergies.${a}`)).join(", ")}
            {g.allergies.includes("other") ? ` (${g.otherAllergy})` : ""}
          </p>

          {passportImages.find((img) => img.guestIndex === idx) && (
            <img
              src={passportImages.find((img) => img.guestIndex === idx).preview}
              alt={`passport-${idx}`}
              style={{
                width: 64,
                height: 64,
                objectFit: "cover",
                borderRadius: 6,
                border: "1px solid #ccc",
                marginTop: 6,
              }}
            />
          )}
        </div>
      ))}

      <div style={{ marginTop: "1.5rem" }}>
        <button
          onClick={handleBack}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginRight: "1rem",
          }}
        >
          {t("confirm.back")}
        </button>

        <button
          onClick={handleFinalSubmit}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {t("confirm.submit")}
        </button>
      </div>
    </div>
  );
}

export default RSVPConfirm;
