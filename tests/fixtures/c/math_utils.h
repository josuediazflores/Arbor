#ifndef MATH_UTILS_H
#define MATH_UTILS_H

/**
 * @brief Adds two integers together.
 * @param a The first operand.
 * @param b The second operand.
 * @return The sum of a and b.
 */
int add(int a, int b);

/**
 * @brief Computes the factorial of n.
 * @param n Non-negative integer.
 * @return The factorial of n, or -1 on error.
 * @throws overflow if n > 20.
 */
long factorial(int n);

typedef struct {
    double x;
    double y;
} Point;

/**
 * @brief Color enumeration.
 */
enum Color {
    RED,
    GREEN,
    BLUE
};

#endif
