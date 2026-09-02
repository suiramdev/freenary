import {
  CATEGORY_COLOR_VALUES,
  CATEGORY_ICON_NAMES,
} from "@freenary/api/lib/taxonomy";
import { Button } from "@freenary/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@freenary/ui/components/drawer";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@freenary/ui/components/field";
import { Input } from "@freenary/ui/components/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@freenary/ui/components/toggle-group";
import { cn } from "@freenary/ui/lib/utils";
import { RiCheckLine } from "@remixicon/react";
import { useEffect, useState } from "react";

import { CategoryGroupSelect } from "@/components/budget/category-group-select";
import {
  CategoryIcon,
  SWATCH_BY_COLOR,
} from "@/components/budget/category-icon";
import { useCustomCategoryForm } from "@/hooks/settings/use-custom-category-form";
import type { EditedCustomCategory } from "@/hooks/settings/use-custom-category-form";
import {
  CATEGORY_COLOR_LABELS,
  CATEGORY_ICON_LABELS,
} from "@/lib/settings/category-appearance-labels";
import { m } from "@/paraglide/messages.js";

/** The swatch and the glyph cover the toggle's pressed background, so add a ring. */
const SELECTED_RING = "aria-pressed:ring-2 aria-pressed:ring-ring";

interface CustomCategoryDrawerProps {
  edited: EditedCustomCategory | null;
  onCreated?: (key: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const CustomCategoryDrawer = ({
  edited,
  onCreated,
  onOpenChange,
  open,
}: CustomCategoryDrawerProps) => {
  // Held so the title and fields keep the edited category while the drawer
  // animates closed, instead of snapping to the empty "new" state.
  const [shown, setShown] = useState(edited);
  if (open && edited !== shown) {
    setShown(edited);
  }

  const { form, isSaving } = useCustomCategoryForm({
    edited: shown,
    onCreated,
    onDone: () => onOpenChange(false),
  });

  // The component survives close/reopen, so the form would otherwise show the
  // previous unsaved draft (or stale edit) instead of the requested values.
  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [form, open]);

  return (
    <Drawer onOpenChange={onOpenChange} open={open} swipeDirection="right">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {shown
              ? m.settings_category_edit_title()
              : m.settings_category_new()}
          </DrawerTitle>
          <DrawerDescription>
            {m.settings_category_drawer_description()}
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="overflow-y-auto p-4 pt-0"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="label">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor="custom-category-label">
                    {m.settings_field_name()}
                  </FieldLabel>
                  <Input
                    aria-invalid={field.state.meta.errors.length > 0}
                    id="custom-category-label"
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder={m.settings_category_name_placeholder()}
                    value={field.state.value}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>

            <form.Field name="color">
              {(field) => (
                <FieldSet>
                  <FieldLegend variant="label">
                    {m.settings_field_color()}
                  </FieldLegend>
                  <ToggleGroup
                    className="flex-wrap"
                    value={[field.state.value]}
                    onValueChange={([next]) => {
                      const color = CATEGORY_COLOR_VALUES.find(
                        (value) => value === next
                      );
                      if (color) {
                        field.handleChange(color);
                      }
                    }}
                  >
                    {CATEGORY_COLOR_VALUES.map((color) => (
                      <ToggleGroupItem
                        key={color}
                        aria-label={CATEGORY_COLOR_LABELS[color]()}
                        className={cn("size-8 rounded-full p-0", SELECTED_RING)}
                        value={color}
                      >
                        <span
                          className={cn(
                            "flex size-full items-center justify-center rounded-full",
                            SWATCH_BY_COLOR[color]
                          )}
                        >
                          {field.state.value === color ? <RiCheckLine /> : null}
                        </span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FieldSet>
              )}
            </form.Field>

            <form.Field name="icon">
              {(field) => (
                <FieldSet>
                  <FieldLegend variant="label">
                    {m.settings_field_icon()}
                  </FieldLegend>
                  <form.Subscribe selector={(state) => state.values.color}>
                    {(color) => (
                      // Past ToggleGroup's usual 2–7 options, but a grid of
                      // glyphs reads faster here than any list control.
                      <ToggleGroup
                        className="grid grid-cols-9"
                        value={[field.state.value]}
                        onValueChange={([next]) => {
                          const name = CATEGORY_ICON_NAMES.find(
                            (value) => value === next
                          );
                          if (name) {
                            field.handleChange(name);
                          }
                        }}
                      >
                        {CATEGORY_ICON_NAMES.map((icon) => (
                          <ToggleGroupItem
                            key={icon}
                            aria-label={CATEGORY_ICON_LABELS[icon]()}
                            className={cn(
                              "size-8 rounded-full p-0",
                              SELECTED_RING
                            )}
                            value={icon}
                          >
                            <CategoryIcon
                              className="size-7 [&_svg]:size-4"
                              color={color}
                              icon={icon}
                            />
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    )}
                  </form.Subscribe>
                </FieldSet>
              )}
            </form.Field>

            <form.Field name="parentSlug">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="custom-category-parent">
                    {m.settings_field_parent()}
                  </FieldLabel>
                  <CategoryGroupSelect
                    id="custom-category-parent"
                    noneLabel={m.settings_category_parent_none()}
                    onValueChange={(v) => field.handleChange(v)}
                    value={field.state.value}
                  />
                </Field>
              )}
            </form.Field>

            <Field orientation="horizontal" className="justify-end">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="ghost"
              >
                {m.settings_cancel()}
              </Button>
              <Button disabled={isSaving} type="submit">
                {shown
                  ? m.settings_save_changes()
                  : m.settings_category_create()}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
