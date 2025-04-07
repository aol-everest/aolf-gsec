SET search_path TO aolf_gsec_app, public;

SELECT 
    CONCAT(u.first_name, ' ', u.last_name) as poc_name,
    u.phone_number as poc_phone,
    u.email as poc_email,
    CONCAT(
        CASE d.honorific_title
            WHEN 'NA' THEN ''
            WHEN 'MR' THEN 'Mr.'
            WHEN 'MRS' THEN 'Mrs.'
            WHEN 'MS' THEN 'Ms.'
            WHEN 'ADMIRAL' THEN 'Admiral'
            WHEN 'AIR_CHIEF_MARSHAL' THEN 'Air Chief Marshal'
            WHEN 'AMBASSADOR' THEN 'Ambassador'
            WHEN 'APOSTLE' THEN 'Apostle'
            WHEN 'BISHOP' THEN 'Bishop'
            WHEN 'BRIGADIER_GENERAL' THEN 'Brigadier General'
            WHEN 'CHANCELLOR' THEN 'Chancellor'
            WHEN 'CHIEF' THEN 'Chief'
            WHEN 'COLONEL' THEN 'Colonel'
            WHEN 'COMMISSIONER' THEN 'Commissioner'
            WHEN 'COUNSELLOR' THEN 'Counsellor'
            WHEN 'DR' THEN 'Dr.'
            WHEN 'ELDER' THEN 'Elder'
            WHEN 'GENERAL' THEN 'General'
            WHEN 'GENERAL_RETD' THEN 'General (Retd.)'
            WHEN 'HE' THEN 'H.E.'
            WHEN 'HER_EXCELLENCY_THE_RIGHT_HONOURABLE' THEN 'Her Excellency the Right Honourable'
            WHEN 'HER_MAJESTY' THEN 'Her Majesty'
            WHEN 'HER_WORSHIP' THEN 'Her Worship'
            WHEN 'HIS_EMINENCE' THEN 'His Eminence'
            WHEN 'HIS_MAJESTY' THEN 'His Majesty'
            WHEN 'HIS_WORSHIP' THEN 'His Worship'
            WHEN 'IMAM' THEN 'Imam'
            WHEN 'JUSTICE' THEN 'Justice'
            WHEN 'KAMI' THEN 'Kami'
            WHEN 'LT_COL' THEN 'Lt. Col'
            WHEN 'PASTOR' THEN 'Pastor'
            WHEN 'PRIEST' THEN 'Priest'
            WHEN 'PROF' THEN 'Prof.'
            WHEN 'RABBI' THEN 'Rabbi'
            WHEN 'RIGHT_HONOURABLE' THEN 'Right Honourable'
            WHEN 'SADHVI' THEN 'Sadhvi'
            WHEN 'SERGEANT' THEN 'Sergeant'
            WHEN 'SHERIFF' THEN 'Sheriff'
            WHEN 'SHRI' THEN 'Shri'
            WHEN 'SIR' THEN 'Sir'
            WHEN 'SMT' THEN 'Smt.'
            WHEN 'SUSHRI' THEN 'Sushri'
            WHEN 'SWAMI' THEN 'Swami'
            WHEN 'THE_HONORABLE' THEN 'The Honorable'
            WHEN 'THE_HONOURABLE' THEN 'The Honourable'
            WHEN 'THE_REVEREND' THEN 'The Reverend'
            WHEN 'SHEIKH' THEN 'Sheikh'
            WHEN NULL THEN ''
        END || ' ',
        d.first_name, ' ', d.last_name
    ) as dignitary_name,
    d.title_in_organization as organizational_title,
    d.organization
FROM locations l
JOIN appointments a ON a.location_id = l.id
JOIN appointment_dignitaries ad ON ad.appointment_id = a.id
JOIN dignitaries d ON d.id = ad.dignitary_id
JOIN users u ON u.id = a.requester_id
WHERE l.name = 'Harvard VIP Event';
