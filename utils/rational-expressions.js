$.extend(KhanUtil, {

    getPermutations: function(arr) {
        var permArr = [];
        var usedChars = [];

        function permute(input) {
            for (var i = 0; i < input.length; i++) {
                var term = input.splice(i, 1)[0];
                usedChars.push(term);
                if (input.length == 0) {
                    permArr.push(usedChars.slice());
                }
                permute(input);
                input.splice(i, 0, term);
                usedChars.pop();
            }
            return permArr;
        };

        return permute(arr);
    },

	getExpressionRegex: function(coefficient, vari, constant) {
        // Capture Ax + B or B + Ax, either A or B can be 0

        if (coefficient === 0) {
            var regex = "^\\s*";
            regex += constant < 0 ? "[-\\u2212]\\s*" + (-constant) + "\\s*$" : constant + "\\s*$";
            return regex;
        }

        var regex = "^\\s*";
        if (coefficient < 0) {
            regex += "[-\\u2212]\\s*";
        }
        if (coefficient !== 1 && coefficient !== -1) {
            regex += Math.abs(coefficient) + "\\s*";
        }
        regex += vari + "\\s*";

        if (constant === 0) {
            regex += "$";
        } else {
            regex = "(" + regex;
            regex += constant < 0 ? "[-\\u2212]" : "\\+";
            regex += "\\s*" + Math.abs(constant) + "\\s*$)|(^\\s*";

            if (constant < 0) {
                regex += "[-\\u2212]\\s*";
            }

            regex += Math.abs(constant) + "\\s*";
            regex += coefficient < 0 ? "[-\\u2212]\\s*" : "\\+\\s*";

            if (coefficient !== 1 && coefficient !== -1) {
                regex += Math.abs(coefficient) + "\\s*";
            }
            regex += vari + "\\s*$)";
        }

        return regex;
	},

    /*
    Term in an expression
    Takes an array. The first value is the coefficient
    and subsequent values are variables and their degree
    e.g. Term(5) = 5
         Term(5, 'x') = 5x
         Term(5, 'xy') = 5xy
         Term(5, {'x': 1}) = 5x
         Term(5, {'x': 2}) = 5x^2
         Term(5, {'x': 1, 'y': 2}) = 5xy^2
    */
    Term: function(coefficient, variables) {
        this.coefficient = coefficient;
        this.variables = {};

        if (typeof variables === 'string') {
            for (var i = 0; i < variables.length; i++) {
                this.variables[variables.charAt(i)] = 1;
            }
        } else if (variables !== undefined){
            this.variables = variables;
        }

        // Create a string representing the term
        // e.g. 5yx^2 = 5y1x2
        // Used for hashing
        this.variableString = ''
        for (var vari in this.variables) {
            if (this.variables[vari] !== 0) {
                this.variableString += vari + this.variables[vari];
            } else {
                delete this.variables[vari];
            }
        }

        // Given a mapping of variable to value, {'x' : 2}, evaulate the term
        // Or give a number and all variables will be given that value
        // TODO: Make this work for multi-variable terms
        // when only the value of one variable is given
        this.evaluate = function(values) {
            var value = this.coefficient;

            if (typeof values === 'number') {
                for (var v in this.variables) {
                    value *= Math.pow(values, this.variables[v]);
                }
            } else {
                for (var v in this.variables) {
                    value *= Math.pow(values[v], this.variables[v]);
                }
            }
            return value;
        }

        // Return a new term representing this term multiplied by another term or a number
        this.multiply = function(term) {
            var coefficient = this.coefficient;
            var variables = {};

            for (var i in this.variables) {
                variables[i] = this.variables[i];
            }

            if (typeof term === 'number') {
                coefficient *= term;
            } else {
                coefficient *= term.coefficient;
                for (var i in term.variables) {
                    if (variables[i] != null) {
                        variables[i] += term.variables[i];
                    } else {
                        variables[i] = term.variables[i];
                    }
                }
            }

            return new KhanUtil.Term(coefficient, variables);
        };

        // Return a new term representing this term divided by another term or a number
        this.divide = function(term) {
            var coefficient = this.coefficient;
            var variables = {}

            for (var i in this.variables) {
                variables[i] = this.variables[i];
            }

            if (typeof term === 'number') {
                coefficient /= term;
            } else {
                coefficient /= term.coefficient;
                for (var i in term.variables) {
                    if (variables[i]) {
                        variables[i] -= term.variables[i];
                    } else {
                        variables[i] = -term.variables[i];
                    }
                }
            }

            return new KhanUtil.Term(coefficient, variables);
        };

        // Return a Term object representing the greatest common factor between this term and another
        this.getGCD = function(that) {
            var coefficient = KhanUtil.getGCD(this.coefficient, that.coefficient);
            var variables = {};

            for (var i in this.variables) {
                if (that.variables[i]) {
                    variables[i] = Math.min(this.variables[i], that.variables[i]);
                }
            }

            return new KhanUtil.Term(coefficient, variables);
        };

        // includeSign if term is not the first in an expression
        this.toString = function(includeSign) {
            if (this.coefficient === 0) {
                return "";
            }

            var s = "";
            if (includeSign) {
                s += this.coefficient >= 0 ? " + " : " - ";
            } else if (this.coefficient < 0) {
                s += "-";
            }

            var coefficient = Math.abs(this.coefficient);
            if (!(coefficient === 1 && this.variableString !== "")) {
                s += coefficient;
            }

            for (var vari in this.variables) {
                var degree = this.variables[vari];

                if (degree === 0) {
                    continue;
                }
                s += vari;
                if (degree !== 1) {
                    s += "^" + degree;
                }
            }
            return s;
        };

        // Return a string showing how the term should be evaluated with a given value
        // e.g. 5x^2 evalated with 3 returns 5(3)^2
        // If color is defined, the the value representing the variable is colored
        this.getEvaluateString = function(values, includeSign, color) {
            var s = '';

            if (includeSign) {
                s += this.coefficient >= 0 ? ' + ' : ' - ';
            } else if (this.coefficient < 0) {
                s += '-';
            }

            var coefficient = Math.abs(this.coefficient);
            if (!(coefficient === 1 && this.variableString !== '')) {
                s += coefficient;
                if (this.variableString !== '') {
                    s += '\\cdot';
                }
            }

            for (var vari in this.variables) {
                var degree = this.variables[vari];
                var value = (typeof values === 'number') ? values : values[vari];

                if (color !== undefined) {
                    value = '\\' + color + '{' + value + '}';
                }

                s += (value < 0 || degree === 1) ? value : '(' + value + ')^' + degree;
            }

            return s;
        };

        // Return a regex that will capture this term
        // If includeSign is true, then 4x is captured by +4x
        this.regex = function(includeSign) {
            if (this.coefficient === 0) {
                return '';
            }

            // Include leading space if there are earlier terms
            if (this.coefficient < 0){
                var regex = includeSign ? '[-\\u2212]\\s*' : '\\s*[-\\u2212]\\s*';
            } else {
                var regex = includeSign ? '\\+\\s*' : '\\s*';
            }

            if (!(Math.abs(this.coefficient) === 1 && this.variableString !== '')) {
                regex += Math.abs(this.coefficient);
            }

            // Add variable of degree 1 in random order
            // Won't work if there are multiple variable or variables of degree > 1
            for (var vari in this.variables) {
                if (this.variables[vari] === 1) {
                    regex += vari;
                }
            }

            return regex + '\\s*';
        };

    },

    /*
        A flat (i.e. no parentheses), multi-variable polynomial expression
        Represented as an array of terms that are added together
        Terms can be numbers, of [variable, degree]
        e.g. [5, [1, 'x']] = 5 + x
        e.g. [5, [2, {'x': 2}] = 5 + 2x^2
        e.g. [5, [2, {'x': 2, 'y': 1}]] = 5 + 2x^2y
    */
    RationalExpression: function(terms) {
        this.terms = [];

        for (var i = 0; i < terms.length; i++) {
            var term = terms[i];
            if (term instanceof KhanUtil.Term) {
                var newTerm = term;
            } else if (typeof term === 'number') {
                var newTerm = new KhanUtil.Term(term);
            } else {
                var newTerm = new KhanUtil.Term(term[0], term[1]);
            }
            if (newTerm.coefficient !== 0) {
                this.terms.push(newTerm);
            }
        }

        // Combine any terms that have the same variable and remove any with a coefficient of 0
        this.combineLikeTerms = function() {
            var variables = {};

            for (var i = 0; i < this.terms.length; i++) {
                var term = this.terms[i];
                var s = term.variableString;

                if (variables[s]) {
                    variables[s].coefficient += term.coefficient;
                } else {
                    variables[s] = term;
                }
            }

            this.terms = [];
            for (var v in variables) {
                if (variables[v].coefficient !== 0) {
                    this.terms.push(variables[v]);
                }
            }
        };
        this.combineLikeTerms();

        this.evaluate = function(values) {
            var value = 0;
            for (var i = 0; i < this.terms.length; i++) {
                value += this.terms[i].evaluate(values);
            }
            return value;
        };

        // Return a new expression which is the sum of this one and the one passed in
        this.add = function(that) {
            var terms = [];

            for (var i = 0; i < this.terms.length; i++) {
                var term = this.terms[i];
                terms.push([term.coefficient, term.variables]);
            }

            for (var i = 0; i < that.terms.length; i++) {
                var term = that.terms[i];
                terms.push([term.coefficient, term.variables]);
            }

            var result = new KhanUtil.RationalExpression(terms);
            result.combineLikeTerms();

            return result;
        };

        // Return a new expression representing the product of this one and the one passed in
        this.multiply = function(expression) {
            if (expression instanceof KhanUtil.RationalExpression) {
                var multiplyTerms = expression.terms;
            } else if (typeof expression === 'number' || expression instanceof KhanUtil.Term) {
                var multiplyTerms = [expression];
            } else {
                // Assume it's a variable name
                var multiplyTerms = [new KhanUtil.Term(1, expression)];
            }

            var terms = [];

            for (var i = 0; i < multiplyTerms.length; i++) {
                var value = multiplyTerms[i];

                for (var j = 0; j < this.terms.length; j++) {
                    terms.push(this.terms[j].multiply(value));
                }
            }

            return new KhanUtil.RationalExpression(terms);
        };

        // Return a new expression representing this one divided by a term or number
        // Note you cannot divide by another expression
        this.divide = function(term) {
            var terms = [];

            for (var i = 0; i < this.terms.length; i++) {
                terms.push(this.terms[i].divide(term));
            }

            return new KhanUtil.RationalExpression(terms);
        };

        // Return a Term object representing the greatest common divisor of all the terms in this expression
        this.factor = function() {
            var GCD = this.terms[0];
            for (var i=0; i<this.terms.length; i++) {
                GCD = GCD.getGCD(this.terms[i]);
            }
            return GCD;
        };

        // Return a Term object representing the greatest common factor between this expression and another
        this.getGCD = function(that) {
            var t1 = this.factor();
            var t2 = that.factor();
            return t1.getGCD(t2);
        };

        this.toString = function() {
            var s = this.terms[0].toString();

            for (var i = 1; i < this.terms.length; i++) {
                s += this.terms[i].toString(s !== "");
            }

            return s !== "" ? s : '0';
        };

        // Returns a string showing the expression with variable substituted.
        this.getEvaluateString = function(values, color) {
            var s = this.terms[0].getEvaluateString(values, false, color);

            for (var i = 1; i < this.terms.length; i++) {
                s += this.terms[i].getEvaluateString(values, true, color);
            }

            return s !== "" ? s : '0';
        };

        // Returns a single regex to capture this expression.
        // It will capture every permutations of terms so is
        // not recommended for expressions with more than 3-4 terms
        this.regex = function() {
            var permutations = KhanUtil.getPermutations(this.terms);
            var regex = "";

            for (var p = 0; p < permutations.length; p++) {
                regex += p ? "|(?:^" : "(?:^";

                var terms = permutations[p];
                for (var i = 0; i < terms.length; i++) {
                    regex += terms[i].regex(i);
                }

                regex += "$)";
            }

            return regex;
        };
    }

});