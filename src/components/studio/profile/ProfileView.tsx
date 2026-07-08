"use client";

import { BadgeCheck, Camera, Loader2, Speaker, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  CardTitle,
  GlassButton,
  Micro,
  Pill,
  SectionCard,
} from "@/components/studio/ui";
import { equipment } from "@/lib/studio/data";
import { cn } from "@/lib/utils";
import {
  useGetDjReviewsQuery,
  useGetUserQuery,
  useListGenresQuery,
  useUpdateDjGenresMutation,
  useUpdateUserMutation,
  useUploadUserAvatarMutation,
} from "@/store/api";
import { resolveRemoteAssetUrl } from "@/utilities/remote-avatar-url";

const inputCls =
  "w-full rounded-xl border border-studio-line bg-studio-surface px-3 py-2 text-[13px] text-studio-ink placeholder:text-studio-ink3 focus:border-studio-violet focus:outline-none";

function initialsOf(name?: string | null): string {
  if (!name) return "DJ";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "DJ";
}

export default function ProfileView() {
  const { data: user, isLoading } = useGetUserQuery();
  const { data: allGenres = [] } = useListGenresQuery();
  const { data: reviews = [] } = useGetDjReviewsQuery(
    { djId: user?.id ?? "" },
    { skip: !user?.id }
  );

  const [updateUser, { isLoading: saving }] = useUpdateUserMutation();
  const [updateDjGenres, { isLoading: savingGenres }] =
    useUpdateDjGenresMutation();
  const [uploadAvatar, { isLoading: uploading }] =
    useUploadUserAvatarMutation();

  const fileRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form once the profile arrives.
  useEffect(() => {
    if (!user) return;
    setBio(user.bio ?? "");
    setDisplayName(user.display_name ?? "");
    setLocation(user.location ?? "");
    setHourlyRate(user.hourly_rate != null ? String(user.hourly_rate) : "");
    setSelectedGenres(user.genres ?? []);
  }, [user]);

  const toggleGenre = (slug: string) => {
    setSelectedGenres((g) =>
      g.includes(slug) ? g.filter((x) => x !== slug) : [...g, slug]
    );
  };

  const onSave = async () => {
    setError(null);
    try {
      await Promise.all([
        updateUser({
          display_name: displayName || undefined,
          bio,
          location: location || undefined,
          hourly_rate: hourlyRate ? Number(hourlyRate) : undefined,
        }).unwrap(),
        updateDjGenres({ genre_slugs: selectedGenres }).unwrap(),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save your profile — please try again.");
    }
  };

  const onAvatarPicked = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      await uploadAvatar(form).unwrap();
    } catch {
      setError("Avatar upload failed — try a smaller image.");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-studio-ink2">
        <Loader2 size={16} className="animate-spin" /> Loading your profile…
      </div>
    );
  }

  const followers = user.followers_count ?? user.follower_count ?? 0;
  const events =
    user.completed_bookings ?? user.total_bookings ?? user.bookings_count ?? 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Profile</h1>
          <p className="mt-0.5 text-[13px] text-studio-ink2">
            What promoters and fans see on your public SpinLive page.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {saved ? <Pill tone="good">Saved</Pill> : null}
          {error ? <Pill tone="bad">{error}</Pill> : null}
          <GlassButton
            variant="primary"
            disabled={saving || savingGenres}
            onClick={onSave}
          >
            {saving || savingGenres ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            Save changes
          </GlassButton>
        </div>
      </div>

      <div className="grid grid-cols-[340px_1fr] items-start gap-4 max-lg:grid-cols-1">
        {/* Left: identity card */}
        <SectionCard className="text-center">
          <div className="relative mx-auto w-max">
            <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-studio-grad text-3xl font-extrabold text-white ring-4 ring-studio-violet/30">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveRemoteAssetUrl(user.avatar_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initialsOf(user.display_name ?? user.username)
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onAvatarPicked(e.target.files?.[0])}
            />
            <button
              type="button"
              aria-label="Change profile photo"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-studio-line2 bg-studio-surface2 text-studio-ink2 hover:text-studio-ink disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-lg font-extrabold">
            {user.display_name ?? user.username ?? "Your name"}{" "}
            {user.kyc_verified ? (
              <BadgeCheck
                size={17}
                className="text-studio-blue"
                aria-label="Verified creator"
              />
            ) : null}
          </div>
          <div className="text-[12.5px] text-studio-ink2">
            {user.location ?? "Add your location"}
            {user.username ? ` · @${user.username}` : ""}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-studio-line">
            {[
              { v: followers.toLocaleString(), l: "Followers" },
              { v: events.toLocaleString(), l: "Events" },
              {
                v: user.rating_count ? `${user.rating_avg.toFixed(1)}★` : "—",
                l: "Rating",
              },
            ].map((s) => (
              <div key={s.l} className="bg-studio-surface px-1.5 py-2.5">
                <div className="text-[15px] font-extrabold tabular-nums">
                  {s.v}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-studio-ink3">
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-studio-line bg-white/[0.03] px-3.5 py-3">
            <div className="text-left">
              <div className="text-[12.5px] font-bold">Live status</div>
              <div className="text-[11px] text-studio-ink2">
                Managed from the Go Live studio
              </div>
            </div>
            <Pill tone={user.is_live ? "live" : "muted"}>
              {user.is_live ? "LIVE" : "Offline"}
            </Pill>
          </div>

          {user.kyc_verified ? (
            <div className="mt-3 rounded-xl border border-studio-blue/25 bg-studio-blue/10 px-3.5 py-3 text-left">
              <div className="flex items-center gap-2 text-[12.5px] font-bold text-studio-blue">
                <BadgeCheck size={15} /> Verified creator
              </div>
              <div className="mt-0.5 text-[11px] text-studio-ink2">
                Identity and payout account verified.
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-studio-warn/25 bg-studio-warn/10 px-3.5 py-3 text-left">
              <div className="text-[12.5px] font-bold text-studio-warn">
                Verification pending
              </div>
              <div className="mt-0.5 text-[11px] text-studio-ink2">
                Complete KYC to unlock payouts.
              </div>
            </div>
          )}
        </SectionCard>

        {/* Right: editable sections */}
        <div className="flex flex-col gap-4">
          <SectionCard>
            <CardTitle>Display name</CardTitle>
            <input
              className={inputCls}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="DJ Nova"
              aria-label="Display name"
            />
          </SectionCard>

          <SectionCard>
            <CardTitle>Bio</CardTitle>
            <textarea
              className={`${inputCls} resize-y`}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell promoters and fans what your sets are like."
              aria-label="Bio"
            />
          </SectionCard>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <SectionCard>
              <CardTitle>
                Genres
                <span className="text-[11px] font-semibold text-studio-ink3">
                  · pick up to 20
                </span>
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {allGenres.length === 0 ? (
                  <span className="text-xs text-studio-ink3">
                    Loading genre catalog…
                  </span>
                ) : (
                  allGenres
                    .filter((g) => g.is_active)
                    .map((g) => {
                      const on = selectedGenres.includes(g.slug);
                      return (
                        <button
                          key={g.slug}
                          type="button"
                          onClick={() => toggleGenre(g.slug)}
                          aria-pressed={on}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                            on
                              ? "border-studio-violet bg-studio-violet/20 text-studio-violetB"
                              : "border-studio-line bg-white/5 text-studio-ink2 hover:border-studio-violet/50"
                          )}
                        >
                          {g.name}
                        </button>
                      );
                    })
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <CardTitle>Hourly Rate</CardTitle>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-extrabold text-studio-ink2">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className={`${inputCls} !w-28 tabular-nums`}
                  aria-label="Hourly rate"
                />
                <span className="text-[12.5px] text-studio-ink2">/ hour</span>
              </div>
              <Micro className="mt-2.5">
                Shown on your public profile as a starting rate
              </Micro>
            </SectionCard>
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <SectionCard>
              <CardTitle>Location</CardTitle>
              <input
                className={inputCls}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                aria-label="Location"
              />
              <Micro className="mt-2.5">
                Helps local promoters find you in discovery
              </Micro>
            </SectionCard>

            <SectionCard>
              <CardTitle>Equipment</CardTitle>
              {equipment.map((eq) => (
                <div
                  key={eq}
                  className="flex items-center gap-2.5 border-b border-studio-line py-2 text-[12.5px] last:border-b-0"
                >
                  <Speaker
                    size={14}
                    className="flex-none text-studio-violetB"
                  />{" "}
                  {eq}
                </div>
              ))}
            </SectionCard>
          </div>

          <SectionCard>
            <CardTitle>
              Reviews
              <span className="text-[11px] font-semibold text-studio-ink3">
                · {reviews.length} total
              </span>
            </CardTitle>
            {reviews.length === 0 ? (
              <div className="py-4 text-center text-xs text-studio-ink3">
                No reviews yet — they land here after completed bookings.
              </div>
            ) : (
              reviews.slice(0, 5).map((r) => (
                <div
                  key={r.id ?? `${r.reviewer_id}-${r.rating}`}
                  className="border-b border-studio-line py-2.5 last:border-b-0"
                >
                  <div className="flex items-center gap-1.5 text-[12.5px] font-bold">
                    <Star size={13} className="text-studio-warn" />
                    {r.rating ?? "—"} / 5
                    <span className="ml-auto text-[10.5px] font-semibold text-studio-ink3">
                      {r.reviewer_display_name ?? r.reviewer_name ?? "A fan"}
                    </span>
                  </div>
                  {r.comment || r.content || r.text ? (
                    <p className="mt-1 text-[12.5px] text-studio-ink2">
                      {r.comment ?? r.content ?? r.text}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
