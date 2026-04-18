<?php

/**
 * Allowed disciplines per course (must match frontend courseToDisciplines keys/values).
 */
$engineering = [
    'Chemical Engineering',
    'Civil Engineering',
    'Computer Science & Engineering',
    'Electrical Engineering',
    'Electronics & Communication Engineering',
    'Engineering Physics',
    'Mechanical Engineering',
    'Mining Engineering',
    'Petroleum Engineering',
    'Mathematics & Computing',
    'Data Analytics',
    'Mineral Engineering',
    'Mining Machinery Engineering',
];

return [
    'B.Tech / Dual Degree (JEE Advanced)' => $engineering,
    'Integrated M.Tech (JEE Advanced)' => [
        'Mathematics & Computing',
        'Applied Geology',
        'Applied Geophysics',
    ],
    'M.Tech GATE (2-year)' => [
        'Earthquake Science (Applied Geophysics)',
        'Chemical Engg.',
        'Power System Engg - Dawr',
        'CSE - CSE Electronics',
        'Communication & Signal Processing',
        'Mechanical Engineering (Mining Machinery Engineering)',
        'Power Metallurgy',
        'Optical Communication - RF & VLSI Design',
        'Mineral Engg',
        'Environmental Sc. - Fuel &',
        'Industrial Engg & Mgmt, Data Analytics',
        'Machine Design',
        'Thermal Engg',
        'Mining Engg - Geomatics, Tunneling',
        'Petroleum Engg',
        'Pharmaceutical Sc. & Engg',
    ],
    'M.Sc JAM (2-yr)' => [
        'Physics',
        'Chemistry',
        'Mathematics & Computing',
    ],
    'M.Sc.Tech JAM (3-yr)' => [
        'Applied Geology',
        'Applied Geophysics',
    ],
    'MBA (CAT)' => [
        'Business Analytics',
        'Finance/Mktg/HR/Ops',
    ],
    'PhD (GATE/NET)' => [
        'All Engineering Departments',
        'All Science Departments',
        'Management Studies',
        'Humanities & Social Sciences',
    ],
    'M.A. Digital Humanities & Social Sciences' => [
        'Digital Humanities & Social Sciences',
    ],
];
