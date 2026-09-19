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
import { ScrollArea } from "@freenary/ui/components/scroll-area";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@freenary/ui/components/toggle-group";
import { useIcon } from "@freenary/ui/lib/icon-context";
import { cn } from "@freenary/ui/lib/utils";
import { useEffect, useState } from "react";

import { CategoryIcon, SWATCH_BY_COLOR } from "@/entities/category";
import { m } from "@/paraglide/messages.js";

import {
  CATEGORY_COLOR_LABELS,
  CATEGORY_ICON_LABELS,
} from "../model/category-appearance-labels";
import { useCustomCategoryForm } from "../model/use-custom-category-form";
import type { EditedCustomCategory } from "../model/use-custom-category-form";
import { CategoryGroupSelect } from "./category-group-select";

interface CustomCategoryDrawerProps {
  edited: EditedCustomCategory | null;
  onCreated?: (key: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const PRESSED_RING_OVER_OPAQUE_SWATCH =
  "aria-pressed:ring-2 aria-pressed:ring-ring";

export const CustomCategoryDrawer = ({
  edited,
  onCreated,
  onOpenChange,
  open,
}: CustomCategoryDrawerProps) => {
  const [editedHeldThroughCloseAnimation, setEditedHeldThroughCloseAnimation] =
    useState(edited);

  if (open && edited !== editedHeldThroughCloseAnimation) {
    setEditedHeldThroughCloseAnimation(edited);
  }

  const CheckIcon = useIcon("check");

  const { form, isSaving } = useCustomCategoryForm({
    edited: editedHeldThroughCloseAnimation,
    onCreated,
    onDone: () => onOpenChange(false),
  });

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
            {editedHeldThroughCloseAnimation
              ? m.settings_category_edit_title()
              : m.settings_category_new()}
          </DrawerTitle>
          <DrawerDescription>
            {m.settings_category_drawer_description()}
          </DrawerDescription>
        </DrawerHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <ScrollArea className="min-h-0 flex-1" viewportClassName="p-4 pt-0">
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
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
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
                          className={cn(
                            "size-8 rounded-full p-0",
                            PRESSED_RING_OVER_OPAQUE_SWATCH
                          )}
                          value={color}
                        >
                          <span
                            className={cn(
                              "flex size-full items-center justify-center rounded-full",
                              SWATCH_BY_COLOR[color]
                            )}
                          >
                            {field.state.value === color ? <CheckIcon /> : null}
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
                        <ToggleGroup
                          className="grid grid-cols-7"
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
                                PRESSED_RING_OVER_OPAQUE_SWATCH
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
                  {editedHeldThroughCloseAnimation
                    ? m.settings_save_changes()
                    : m.settings_category_create()}
                </Button>
              </Field>
            </FieldGroup>
          </ScrollArea>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
