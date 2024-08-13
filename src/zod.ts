
import zod from "zod";

export const productSchema = zod.object({
    name: zod.string(),
    description: zod.string(),
    price: zod.number(),
    availability: zod.number(),
    SKU: zod.string().toUpperCase(),
    material: zod.string().optional(),
    shape: zod.string().optional(),
    design_style: zod.string().optional(),
    fixture_form: zod.string().optional(),
    ideal_for: zod.string().optional(),
    power_source: zod.string().optional(),
    installation: zod.string().optional(),
    shade_material: zod.string().optional(),
    voltage: zod.string().optional(),
    light_color: zod.string().optional(),
    light_source: zod.string().optional(),
    light_color_temperature: zod.string().optional(),
    included_components: zod.string().optional(),
    lighting_method: zod.string().optional(),
    item_weight: zod.string().optional(),
    height: zod.string().optional(),
    length: zod.string().optional(),
    width: zod.string().optional(),
    quantity: zod.string().optional(),
    power_rating: zod.string().optional(),
    brightness: zod.string().optional(),
    controller_type: zod.string().optional(),
    switch_type: zod.string().optional(),
    switch_mounting: zod.string().optional(),
    mounting_type: zod.string().optional(),
    fixture_type: zod.string().optional(),
    assembly_required: zod.string().optional(),
    primary_material: zod.string().optional(),
    number_of_light_sources: zod.string().optional(),
    surge_protection: zod.string().optional(),
    shade_color: zod.string().optional(),
    key_features: zod.string().optional(),
    batteries: zod.string().optional(),
    embellishment: zod.string().optional(),
    colors: zod.array(
        zod.object({
          color_name: zod.string(),
          hex: zod.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
        })
      ),
})

export const pdUpdateSchema = zod.object({
    name: zod.string().optional(),
    description: zod.string().optional(),
    price: zod.number().optional(),
    availability: zod.number().optional(),
    SKU: zod.string().toUpperCase().optional(),
    material: zod.string().optional(),
    shape: zod.string().optional(),
    design_style: zod.string().optional(),
    fixture_form: zod.string().optional(),
    ideal_for: zod.string().optional(),
    power_source: zod.string().optional(),
    installation: zod.string().optional(),
    shade_material: zod.string().optional(),
    voltage: zod.string().optional(),
    light_color: zod.string().optional(),
    light_source: zod.string().optional(),
    light_color_temperature: zod.string().optional(),
    included_components: zod.string().optional(),
    lighting_method: zod.string().optional(),
    item_weight: zod.string().optional(),
    height: zod.string().optional(),
    length: zod.string().optional(),
    width: zod.string().optional(),
    quantity: zod.string().optional(),
    power_rating: zod.string().optional(),
    brightness: zod.string().optional(),
    controller_type: zod.string().optional(),
    switch_type: zod.string().optional(),
    switch_mounting: zod.string().optional(),
    mounting_type: zod.string().optional(),
    fixture_type: zod.string().optional(),
    assembly_required: zod.string().optional(),
    primary_material: zod.string().optional(),
    number_of_light_sources: zod.string().optional(),
    surge_protection: zod.string().optional(),
    shade_color: zod.string().optional(),
    key_features: zod.string().optional(),
    batteries: zod.string().optional(),
    embellishment: zod.string().optional(),
    colors: zod.array(
      zod.object({
        color_name: zod.string(),
        hex: zod.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
      })
    )
    .optional(),
})


export const categorySchema = zod.object({
    name: zod.string(),
    description: zod.string().optional(),
})

export const admin_signupSchema = zod.object({
    full_name: zod.string(),
    email: zod.string().email(),
    password: zod.string().min(6).optional(),
    role: zod.string().toUpperCase().optional()
});

export const admin_signinSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(6)
});


export const reviewSchema = zod.object({
    rating: zod.number().int().min(0, { message: "Rating must be at least 0" }).max(5, { message: "Rating cannot exceed 5" }),
    review_text: zod.string(),
});

export const user_signupSchema = zod.object({
    full_name: zod.string(),
    email: zod.string().email()
})

export const otpVerificationSchema = zod.object({
    code: zod.string().length(6, 'Invalid OTP'),
})

export const user_signinSchema = zod.object({
    email: zod.string().email()
})

export const a_change_pass_1 = zod.object({
    email: zod.string().email()
})

export const a_change_pass_2 = zod.object({
    oldPassword: zod.string().min(6),
    newPassword: zod.string().min(6)
})

export const signedUrlImageSchema = zod.object({
    imageName: zod.string(),
    contentType: zod.string()
})