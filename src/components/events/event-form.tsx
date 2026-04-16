"use client";

import { useState } from "react";

interface EventFormProps {
  action: (formData: FormData) => Promise<{ errors?: string[] } | void>;
  defaultValues?: Record<string, string | number | null>;
  submitLabel?: string;
}

function FormField({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5"
      >
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/40 min-h-[44px]"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5"
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none transition-colors duration-200 placeholder:text-grey/40 resize-none"
      />
    </div>
  );
}

export function EventForm({
  action,
  defaultValues = {},
  submitLabel = "CREATE EVENT",
}: EventFormProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setErrors([]);
    const result = await action(formData);
    setLoading(false);
    if (result && "errors" in result && result.errors) {
      setErrors(result.errors);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {errors.length > 0 && (
        <div className="bg-error/5 border border-error/20 p-4">
          {errors.map((err, i) => (
            <p
              key={i}
              className="text-error text-sm font-[family-name:var(--font-raleway)]"
            >
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Core details */}
      <section>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
          Event Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Event name"
            name="eventName"
            required
            defaultValue={defaultValues.eventName}
            placeholder="Cocktail Masterclass at KPMG"
          />
          <FormField
            label="Show / conference name"
            name="showName"
            defaultValue={defaultValues.showName}
            placeholder="Digital Health Rewired 2026"
          />
          <FormField
            label="Event date"
            name="eventDate"
            type="date"
            required
            defaultValue={defaultValues.eventDate}
          />
          <FormField
            label="Guest count"
            name="guestCount"
            type="number"
            required
            defaultValue={defaultValues.guestCount}
            placeholder="200"
          />
          <FormField
            label="Venue name"
            name="venueName"
            required
            defaultValue={defaultValues.venueName}
            placeholder="ICC Birmingham"
          />
          <FormField
            label="Hall / room"
            name="venueHallRoom"
            defaultValue={defaultValues.venueHallRoom}
            placeholder="Hall 4"
          />
        </div>
      </section>

      {/* Service configuration */}
      <section>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
          Service
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="eventType"
              className="block font-[family-name:var(--font-raleway)] text-[11px] font-medium tracking-[0.18em] uppercase text-grey mb-1.5"
            >
              Event type
            </label>
            <select
              id="eventType"
              name="eventType"
              defaultValue={
                (defaultValues.eventType as string) || "corporate"
              }
              className="w-full px-3 py-2.5 bg-surface-low border-b-2 border-outline/15 text-charcoal font-[family-name:var(--font-raleway)] text-sm focus:border-gold focus:outline-none min-h-[44px]"
            >
              <option value="corporate">Corporate</option>
              <option value="masterclass">Masterclass</option>
              <option value="drinks_reception">Drinks Reception</option>
              <option value="team_building">Team Building</option>
              <option value="exhibition">Exhibition</option>
              <option value="other">Other</option>
            </select>
          </div>
          <FormField
            label="Prepaid serves"
            name="prepaidServes"
            type="number"
            defaultValue={defaultValues.prepaidServes}
            placeholder="1000"
          />
          <FormField
            label="Stations"
            name="stationCount"
            type="number"
            defaultValue={defaultValues.stationCount}
            placeholder="3"
          />
          <FormField
            label="Staff count"
            name="staffCount"
            type="number"
            defaultValue={defaultValues.staffCount}
            placeholder="4"
          />
        </div>
      </section>

      {/* Times */}
      <section>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
          Times
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <FormField
            label="Arrive"
            name="arriveTime"
            type="time"
            defaultValue={defaultValues.arriveTime}
          />
          <FormField
            label="Setup deadline"
            name="setupDeadline"
            type="time"
            defaultValue={defaultValues.setupDeadline}
          />
          <FormField
            label="Service start"
            name="serviceStart"
            type="time"
            defaultValue={defaultValues.serviceStart}
          />
          <FormField
            label="Service end"
            name="serviceEnd"
            type="time"
            defaultValue={defaultValues.serviceEnd}
          />
          <FormField
            label="Depart"
            name="departTime"
            type="time"
            defaultValue={defaultValues.departTime}
          />
        </div>
      </section>

      {/* Logistics */}
      <section>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
          Logistics
        </h2>
        <div className="space-y-4">
          <TextArea
            label="Install instructions"
            name="installInstructions"
            defaultValue={defaultValues.installInstructions}
            placeholder="Access via Loading Bay A. Security will meet at entrance..."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextArea
              label="Parking instructions"
              name="parkingInstructions"
              defaultValue={defaultValues.parkingInstructions}
              rows={2}
            />
            <TextArea
              label="Access route"
              name="accessRoute"
              defaultValue={defaultValues.accessRoute}
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* Financial (owner/super_admin only — handled by server action) */}
      <section>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-charcoal tracking-tight mb-4">
          Financial
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Invoice amount"
            name="invoiceAmount"
            type="number"
            defaultValue={defaultValues.invoiceAmount}
            placeholder="5000"
          />
          <TextArea
            label="Notes"
            name="notesCustom"
            defaultValue={defaultValues.notesCustom}
            placeholder="Custom notes for this event..."
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-gold text-cream font-[family-name:var(--font-raleway)] text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-gold-ink transition-colors duration-200 disabled:opacity-50 min-h-[44px] cursor-pointer"
        >
          {loading ? "SAVING..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
