#include "math_utils.h"

/**
 * @brief Adds two integers together.
 * @param a The first operand.
 * @param b The second operand.
 * @return The sum of a and b.
 */
int add(int a, int b) {
    return a + b;
}

/**
 * @brief Computes the factorial of n.
 * @param n Non-negative integer.
 * @return The factorial of n, or -1 on error.
 */
long factorial(int n) {
    if (n < 0) return -1;
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
