// ───────────────────────── RSVPPassports.jsx ─────────────────────────
import React, { useCallback, useContext } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { UploadCloud, X, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { RSVPContext } from "../../context/RSVPContext";
import { useTranslation } from "../../context/TranslationContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";

const MAX_SINGLE_FILE_MB = 100;
const IMAGE_EXT_FALLBACK = "jpg";

export default function RSVPPassports() {
  const {
    guests,
    passportImages,
    setPassportImages,
    setGuests
  } = useContext(RSVPContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const maxImages = guests.length;

  const safeFileName = (guest, guestIndex, mimeType) => {
    const ext = mimeType?.split("/")[1] || IMAGE_EXT_FALLBACK;
    const parts = [guest.firstName, guest.middleName, guest.lastName, guestIndex + 1]
      .filter(Boolean)
      .join("_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase();
    return `${parts}.${ext}`;
  };

  const getSafePreview = (file) => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(URL.createObjectURL(file)), 1500);

      const image = new Image();
      image.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0);
          resolve(canvas.toDataURL("image/jpeg"));
        } catch {
          resolve(URL.createObjectURL(file));
        }
      };
      image.onerror = () => {
        clearTimeout(timeout);
        resolve(URL.createObjectURL(file));
      };

      try {
        const reader = new FileReader();
        reader.onload = () => {
          image.src = reader.result;
        };
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      } catch {
        resolve(URL.createObjectURL(file));
      }
    });
  };

  const addFiles = useCallback(async (accepted) => {
    const remaining = maxImages - passportImages.length;
    if (accepted.length > remaining) {
      const msg = t("upload.limitRemaining", { remaining });
      toast.error(msg);
      return;
    }

    const processed = await Promise.all(
      accepted.map(async (file) => {
        let finalFile = file;

        if (file.type.startsWith("image/") && file.size > MAX_SINGLE_FILE_MB * 1024 * 1024) {
          try {
            finalFile = await imageCompression(file, {
              maxSizeMB: 4,
              useWebWorker: true,
            });
            toast(t("upload.compressed"));
          } catch {}
        }

        const preview = await getSafePreview(finalFile);

        return {
          id: uuidv4(),
          guestIndex: null,
          file: finalFile,
          preview,
          status: "queued",
        };
      })
    );

    setPassportImages((q) => [...q, ...processed]);
  }, [passportImages, setPassportImages, maxImages, t]);

  const removeItem = (id) => setPassportImages((q) => q.filter((f) => f.id !== id));
  const clearQueue = () => setPassportImages([]);

  const updateGuestIndex = (id, newIndex) => {
    const indexInt = parseInt(newIndex);
    const isAlreadyUsed = passportImages.some(
      (item) => item.guestIndex === indexInt && item.id !== id
    );
    if (isAlreadyUsed) {
      toast.error(t("upload.guestAlreadyAssigned"));
      return;
    }

    setPassportImages((q) =>
      q.map((item) => {
        if (item.id !== id) return item;

        const guest = guests[indexInt];
        const safeName = safeFileName(guest, indexInt, item.file.type);
        const renamedFile = new File([item.file], safeName, { type: item.file.type });

        // Update the guest's passport flag
        setGuests((prev) => {
          const copy = [...prev];
          copy[indexInt] = { ...copy[indexInt], passport: "yes" };
          return copy;
        });

        return {
          ...item,
          guestIndex: indexInt,
          file: renamedFile,
        };
      })
    );
  };

  const onDrop = (accepted, rejected) => {
    if (rejected.length) toast.error(t("upload.onlyImages"));
    addFiles(accepted);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "image/*": [] },
  });

  const assignedGuestIndices = passportImages
    .filter((img) => img.guestIndex !== null)
    .map((img) => img.guestIndex);

  const hasUnassignedImages = passportImages.some((img) => img.guestIndex === null);

  return (
    <div style={{ height: "100%", display: "flex", padding: "1rem", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 600, padding: "1rem", display: "flex", flexDirection: "column" }}>
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>

        <h1 className="text-2xl font-bold mb-4 text-center">{t("upload.title")}</h1>

        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition mb-6 ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 mb-2" />
          <p>{isDragActive ? t("upload.dropHere") : t("upload.tapOrDrag")}</p>
        </div>

        {passportImages.length > 0 && (
          <>
            <ul
              className="space-y-3 mb-4"
              style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "4px", WebkitOverflowScrolling: "touch" }}
            >
              {passportImages.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 border rounded-lg p-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.preview}
                      alt="preview"
                      style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "0.5rem", flexShrink: 0 }}
                    />
                    <div className="flex-1">
                      <select
                        value={item.guestIndex ?? ''}
                        onChange={(e) => updateGuestIndex(item.id, e.target.value)}
                        className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                      >
                        <option value="">{t("upload.selectGuest")}</option>
                        {guests.map((guest, index) => {
                          const isDisabled = assignedGuestIndices.includes(index) && item.guestIndex !== index;
                          return (
                            <option key={index} value={index} disabled={isDisabled}>
                              {guest.firstName} {guest.lastName} (#{index + 1})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {item.status === "queued" && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-500 hover:text-red-600"
                        aria-label={t("upload.remove")}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex gap-3 mb-4">
              <button
                onClick={clearQueue}
                disabled={passportImages.some((f) => f.status !== "queued")}
                className="flex-1 py-3 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition disabled:opacity-40"
              >
                <Trash2 className="inline-block w-4 h-4 mr-1" /> {t("upload.clearAll")}
              </button>
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem" }}>
          <button
            onClick={() => navigate("/rsvp")}
            className="px-6 py-3 bg-gray-300 rounded hover:bg-gray-400"
          >
            {t("upload.back")}
          </button>
          <button
            onClick={() => {
              if (hasUnassignedImages) {
                toast.error(t("upload.assignAllGuests"));
              } else {
                navigate("/confirm");
              }
            }}
            className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
          >
            {t("upload.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
