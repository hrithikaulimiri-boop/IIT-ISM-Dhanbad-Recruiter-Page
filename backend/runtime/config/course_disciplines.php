<?php

/**
 * Allowed disciplines per course (must match frontend courseToDisciplines keys/values).
 */
$engineering = [
    'Computer Science & Engineering',
    'Electrical Engineering',
    'Electronics & Communication Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Mining Engineering',
    'Petroleum Engineering',
    'Mathematics & Computing',
    'Data Analytics',
];

return [
    'B.Tech' => $engineering,
    'M.Tech' => $engineering,
    'Dual Degree' => $engineering,
    'MBA' => ['MBA'],
    'M.Sc' => ['M.Sc.', 'Mathematics & Computing', 'Data Analytics', 'Computer Science & Engineering', 'Chemical Engineering'],
    'PhD' => array_values(array_unique(array_merge(['PhD'], $engineering))),
];
